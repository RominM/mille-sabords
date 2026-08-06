/**
 * Composable de jeu : enveloppe le moteur @rf/engine dans de la réactivité Vue.
 *
 * Le moteur mute son état EN PLACE (même objet). Vue met en cache les `computed`
 * par identité : lire directement `game.state` ne déclencherait jamais de rendu.
 * On publie donc un instantané CLONÉ (`snapshot`) après chaque action — nouvelle
 * identité à chaque fois → la réactivité se propage. Aucune règle ici, seulement
 * de l'orchestration d'UI ; `game` reste l'autorité (mêmes actions que le futur
 * serveur).
 */
import {
  decideAction,
  Game,
  IllegalActionError,
  WINNING_SCORE,
  type BotDifficulty,
  type GameState,
  type TurnState
} from '@rf/engine'

export type Mode = 'start' | 'playing' | 'turnEnd' | 'finished'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useGame() {
  let game: Game | null = null // autorité (état muté en place)
  const snapshot = shallowRef<GameState | null>(null) // copie pour l'affichage
  const sync = () => {
    snapshot.value = game ? (structuredClone(game.state) as GameState) : null
  }

  const mode = ref<Mode>('start')
  const difficulty = ref<BotDifficulty>('medium')
  const selected = ref<Set<number>>(new Set())
  /** Tête de mort désignée pour la relance exceptionnelle de la Gardienne. */
  const guardianDie = ref<number | null>(null)
  const botThinking = ref(false)
  const turnActor = ref('')
  const transient = ref('')
  /** Vrai pendant le jet de dés : les boutons d'action sont alors inactifs. */
  const rolling = ref(false)
  const ROLL_MS = 450

  // ── Timer de tour (affichage) ───────────────────────────────────────────────
  // Décompte visuel montré sur la carte du joueur actif. Il n'applique PAS
  // encore la règle de timeout du moteur (DECISION_TIMEOUT_MS) — ce sera fait
  // avec la passe sur la logique.
  const TURN_SECONDS = 60
  const secondsLeft = ref(TURN_SECONDS)
  let timerId: ReturnType<typeof setInterval> | null = null

  function stopTimer(): void {
    if (timerId) {
      clearInterval(timerId)
      timerId = null
    }
  }
  function restartTimer(): void {
    stopTimer()
    secondsLeft.value = TURN_SECONDS
    timerId = setInterval(() => {
      secondsLeft.value = Math.max(0, secondsLeft.value - 1)
      if (secondsLeft.value === 0) stopTimer()
    }, 1000)
  }
  onScopeDispose(stopTimer)

  // Lectures réactives (sur l'instantané cloné).
  const turn = computed<TurnState | null>(() => snapshot.value?.turn ?? null)
  const players = computed(() => snapshot.value?.players ?? [])
  const currentIndex = computed(() => snapshot.value?.currentPlayerIndex ?? 0)
  const currentPlayer = computed(() => players.value[currentIndex.value] ?? null)
  const gamePhase = computed(() => snapshot.value?.phase ?? 'playing')
  const winner = computed(() => players.value.find((p) => p.id === snapshot.value?.winnerId) ?? null)

  // ── Cycle de jeu ────────────────────────────────────────────────────────────

  /** Équipage par défaut si la partie est lancée sans passer par le lobby. */
  const DEFAULT_ROSTER: TableSeat[] = [
    { id: 'you', name: 'Toi', bot: false },
    { id: 'bot', name: 'Le Corsaire', bot: true }
  ]

  /** Mémorisé pour que « Rejouer » relance la même table. */
  let currentRoster: TableSeat[] = DEFAULT_ROSTER

  /** Portrait choisi à la composition de la table, ou rien si le défaut suffit. */
  function avatarOf(playerId: string): string | undefined {
    return currentRoster.find((s) => s.id === playerId)?.avatar
  }

  function newGame(diff: BotDifficulty, roster?: TableSeat[]): void {
    difficulty.value = diff
    if (roster?.length) currentRoster = roster
    game = new Game(currentRoster.map((s) => ({ id: s.id, name: s.name, bot: s.bot })))
    startTurn()
  }

  function startTurn(): void {
    transient.value = ''
    selected.value = new Set()
    guardianDie.value = null
    game!.startTurn()
    turnActor.value = game!.currentPlayer.name
    mode.value = 'playing'
    restartTimer()
    sync()
    if (game!.currentPlayer.bot) void runBot()
  }

  function afterAction(): void {
    // On NE vide PAS la sélection : les dés gardés le restent d'une relance à
    // l'autre (on ne relance que ceux laissés au centre).
    if (game!.state.turn!.phase === 'ended') {
      mode.value = 'turnEnd'
      stopTimer()
    }
    sync()
  }

  function human(fn: () => void): void {
    if (botThinking.value) return
    try {
      fn()
      transient.value = ''
      afterAction()
    } catch (err) {
      if (err instanceof IllegalActionError) {
        transient.value = err.message
        sync()
      } else throw err
    }
  }

  /**
   * Dés qui partiront à la relance = ceux que le joueur n'a PAS gardés.
   * La sélection (`selected`) désigne les dés à GARDER ; les têtes de mort sont
   * verrouillées par le moteur donc gardées d'office, et les dés réservés
   * (Île au Trésor) ne repartent jamais.
   *
   * Renvoie une liste VIDE quand la relance serait illégale — moins de deux dés,
   * ou l'intégralité des dés — pour que le bouton se grise au lieu de lever une
   * erreur du moteur au clic.
   */
  function eligibleReroll(): number[] {
    const t = game?.state.turn
    if (!t) return []
    const ids = t.dice
      .filter((d) => d.face !== null && !d.locked && !d.banked && !selected.value.has(d.id))
      .map((d) => d.id)
    // La tête confiée à la Gardienne repart AVEC les autres : le moteur exige
    // qu'elle fasse partie de la sélection relancée.
    if (guardianDie.value !== null) ids.push(guardianDie.value)
    if (ids.length < 2 || ids.length >= t.dice.length) return []
    return ids
  }

  function toggleDie(id: number): void {
    if (botThinking.value) return
    const t = game?.state.turn
    if (!t || t.phase !== 'decision') return
    const d = t.dice[id]!
    if (d.face === null) return

    // Une tête de mort est maudite : seule la Gardienne peut la renvoyer, une
    // fois par tour. Cliquer dessus la désigne (ou la relâche).
    if (d.locked) {
      if (!t.guardianAvailable || d.face !== 'skull') return
      guardianDie.value = guardianDie.value === id ? null : id
      return
    }

    const s = new Set(selected.value)
    s.has(id) ? s.delete(id) : s.add(id)
    selected.value = s
  }

  const roll = () => human(() => game!.act({ type: 'roll' }))
  const reroll = () =>
    human(() => {
      const g = guardianDie.value
      game!.act({
        type: 'reroll',
        diceIds: eligibleReroll(),
        ...(g !== null ? { guardianDieId: g } : {})
      })
      guardianDie.value = null
    })
  const stop = () => human(() => game!.act({ type: 'stop' }))

  /**
   * Action du bouton principal : il reste le même tout au long du tour.
   * Premier lancer / Île de la Tête-de-Mort → lancer ; sinon relancer les dés
   * non gardés.
   */
  const rollOrReroll = () => {
    if (rolling.value || botThinking.value) return
    const phase = game?.state.turn?.phase
    if (phase !== 'first-roll' && phase !== 'island-roll' && phase !== 'decision') return
    rolling.value = true
    if (phase === 'decision') reroll()
    else roll()
    // Laisse le temps au jet d'être perçu (et plus tard, à l'animation 3D).
    setTimeout(() => (rolling.value = false), ROLL_MS)
  }
  const bank = () =>
    human(() =>
      game!.act({
        type: 'bank',
        diceIds: [...selected.value].filter((id) => {
          const d = game!.state.turn!.dice[id]!
          return !d.banked && d.face !== 'skull'
        })
      })
    )
  const unbank = () =>
    human(() =>
      game!.act({
        type: 'unbank',
        diceIds: [...selected.value].filter((id) => game!.state.turn!.dice[id]!.banked)
      })
    )

  function continueGame(): void {
    if (game!.state.phase === 'finished') {
      mode.value = 'finished'
      sync()
      return
    }
    startTurn()
  }

  async function runBot(): Promise<void> {
    botThinking.value = true
    await sleep(650)
    let guard = 0
    while (game!.state.turn && game!.state.turn.phase !== 'ended' && guard++ < 200) {
      const action = decideAction(game!.state.turn, { difficulty: difficulty.value })
      game!.act(action)
      sync()
      await sleep(750)
    }
    botThinking.value = false
    mode.value = 'turnEnd'
    stopTimer()
    sync()
  }

  return {
    WINNING_SCORE,
    TURN_SECONDS,
    secondsLeft,
    mode,
    difficulty,
    selected,
    botThinking,
    rolling,
    turnActor,
    transient,
    turn,
    players,
    currentIndex,
    currentPlayer,
    gamePhase,
    winner,
    newGame,
    roll,
    reroll,
    rollOrReroll,
    stop,
    bank,
    unbank,
    toggleDie,
    continueGame,
    eligibleReroll,
    avatarOf,
    guardianDie
  }
}
