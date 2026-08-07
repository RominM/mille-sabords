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
  applyAction,
  decideAction,
  DECISION_TIMEOUT_MS,
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

  // ── Minuteur de DÉCISION ────────────────────────────────────────────────────
  // Il ne borne pas le tour mais chaque décision : un joueur peut relancer
  // autant qu'il veut, le compte repart à zéro à chaque lancer. Ce qu'on limite,
  // c'est le temps passé à choisir quels dés garder.
  //
  // À l'expiration, on applique la règle du moteur : rien de lancé → 0 point et
  // la main passe ; des dés sur la table → arrêt volontaire, on compte et on
  // passe. Dans tous les cas la partie avance, même si un joueur s'absente.
  const TURN_SECONDS = DECISION_TIMEOUT_MS / 1000
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
    // L'IA joue seule et sans délibérer : lui opposer un minuteur n'aurait pas
    // de sens, et pourrait lui couper un tour en cours.
    if (game?.currentPlayer.bot) return
    timerId = setInterval(() => {
      secondsLeft.value = Math.max(0, secondsLeft.value - 1)
      if (secondsLeft.value > 0) return
      stopTimer()
      expireDecision()
    }, 1000)
  }

  function expireDecision(): void {
    const t = game?.state.turn
    if (!t || t.phase === 'ended') return
    game!.timeout()
    afterAction()
    // Le joueur est probablement absent : personne ne cliquera « Continuer ».
    // On laisse le récapitulatif à l'écran le temps d'être lu, puis on enchaîne
    // de nous-mêmes — c'est tout l'objet du minuteur.
    setTimeout(() => {
      if (mode.value === 'turnEnd') continueGame()
    }, 2500)
  }

  onScopeDispose(stopTimer)

  // Lectures réactives (sur l'instantané cloné).
  const turn = computed<TurnState | null>(() => snapshot.value?.turn ?? null)
  const players = computed(() => snapshot.value?.players ?? [])
  const currentIndex = computed(() => snapshot.value?.currentPlayerIndex ?? 0)
  const currentPlayer = computed(() => players.value[currentIndex.value] ?? null)
  const gamePhase = computed(() => snapshot.value?.phase ?? 'playing')
  const winner = computed(() => players.value.find((p) => p.id === snapshot.value?.winnerId) ?? null)

  /**
   * Ce que le joueur encaisserait s'il s'arrêtait MAINTENANT.
   *
   * On simule un arrêt via le moteur au lieu de rescorer les dés à côté : c'est
   * la seule façon d'être juste sur les cas particuliers — trois têtes qui
   * annulent tout, défi du bateau manqué qui passe le total en négatif, dés
   * réservés de l'Île au Trésor. `applyAction` est pure, l'instantané n'est
   * donc pas touché.
   */
  const potentialScore = computed<number | null>(() => {
    const t = turn.value
    if (!t || t.phase !== 'decision') return null
    try {
      return applyAction(t, { type: 'stop' }, () => []).outcome?.score ?? null
    } catch {
      return null
    }
  })

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
    } else {
      // Une nouvelle décision commence : le joueur récupère tout son temps.
      restartTimer()
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

    // Île au Trésor : garder un dé, c'est le RÉSERVER sur la carte — les deux
    // gestes n'en font qu'un. Le clic fait donc l'aller-retour lui-même, et un
    // second clic le reprend. Deux boutons séparés n'apportaient rien.
    if (t.card.type === 'treasure-island') {
      human(() => game!.act({ type: d.banked ? 'unbank' : 'bank', diceIds: [id] }))
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
    guardianDie,
    potentialScore
  }
}
