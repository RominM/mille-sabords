/**
 * Orchestration d'UI du jeu.
 *
 * Ce composable ne détient PLUS le moteur : il envoie des commandes à un
 * transport et lit l'état que celui-ci publie (cf. `useGameTransport`). Tout ce
 * qui suit est donc de la mise en scène — minuteur, sélection de dés, tempo de
 * l'IA — et aucune règle. L'autorité est ailleurs, ce qui la rendra
 * remplaçable par le serveur sans toucher aux composants.
 */
import {
  applyAction,
  decideAction,
  DECISION_TIMEOUT_MS,
  WINNING_SCORE,
  type BotDifficulty,
  type TurnAction,
  type TurnState
} from '@rf/engine'

export type Mode = 'start' | 'playing' | 'turnEnd' | 'finished'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useGame(transport: GameTransport = createLocalTransport()) {
  const snapshot = transport.state
  /** Vrai quand le serveur pilote le déroulement : on obéit au lieu de mener. */
  const remote = transport.remote

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

  // Lectures réactives (sur l'état publié par le transport).
  const turn = computed<TurnState | null>(() => snapshot.value?.turn ?? null)
  const players = computed(() => snapshot.value?.players ?? [])
  const currentIndex = computed(() => snapshot.value?.currentPlayerIndex ?? 0)
  const currentPlayer = computed(() => players.value[currentIndex.value] ?? null)
  const gamePhase = computed(() => snapshot.value?.phase ?? 'playing')
  const winner = computed(() => players.value.find((p) => p.id === snapshot.value?.winnerId) ?? null)

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
    if (currentPlayer.value?.bot) return
    // En distant, c'est le serveur qui expire les décisions — le décompte
    // affiché se déduit de l'échéance qu'il diffuse (voir plus bas).
    if (remote) return
    timerId = setInterval(() => {
      secondsLeft.value = Math.max(0, secondsLeft.value - 1)
      if (secondsLeft.value > 0) return
      stopTimer()
      expireDecision()
    }, 1000)
  }

  function expireDecision(): void {
    const t = turn.value
    if (!t || t.phase === 'ended') return
    transport.send({ type: 'timeout' })
    afterAction()
    // Le joueur est probablement absent : personne ne cliquera « Continuer ».
    // On laisse le récapitulatif à l'écran le temps d'être lu, puis on enchaîne
    // de nous-mêmes — c'est tout l'objet du minuteur.
    setTimeout(() => {
      if (mode.value === 'turnEnd') continueGame()
    }, 2500)
  }

  /** Ticker d'AFFICHAGE du mode distant, distinct du minuteur local. */
  let remoteTickId: ReturnType<typeof setInterval> | null = null

  onScopeDispose(() => {
    stopTimer()
    if (remoteTickId) clearInterval(remoteTickId)
    transport.close()
  })

  /**
   * En distant, l'écran SUIT l'état reçu : le serveur ouvre les tours, expire
   * les décisions et joue les IA. On se contente d'en déduire l'affichage — d'où
   * un `watch` plutôt que des appels, qui entreraient en course avec lui.
   */
  if (remote) {
    watch(
      snapshot,
      (s) => {
        if (!s) return
        turnActor.value = s.players[s.currentPlayerIndex]?.name ?? ''
        mode.value =
          s.phase === 'finished' ? 'finished' : s.turn?.phase === 'ended' ? 'turnEnd' : 'playing'
      },
      // `immediate` est indispensable : l'état arrive souvent AVANT que le
      // plateau ne soit monté — la partie démarre alors qu'on est encore au
      // lobby. Sans lui, l'écran resterait bloqué sur « start » à l'arrivée.
      { immediate: true }
    )

    // Le décompte se déduit de l'échéance diffusée. Les horloges des deux
    // machines peuvent différer de quelques secondes : ce n'est qu'un affichage,
    // l'expiration réelle reste arbitrée par le serveur.
    remoteTickId = setInterval(() => {
      const deadline = snapshot.value?.decisionDeadline
      secondsLeft.value = deadline
        ? Math.max(0, Math.round((deadline - Date.now()) / 1000))
        : TURN_SECONDS
    }, 500)
  }

  /**
   * Ce que le joueur encaisserait s'il s'arrêtait MAINTENANT.
   *
   * On simule un arrêt via le moteur au lieu de rescorer les dés à côté : c'est
   * la seule façon d'être juste sur les cas particuliers — trois têtes qui
   * annulent tout, défi du bateau manqué qui passe le total en négatif, dés
   * réservés de l'Île au Trésor. `applyAction` est pure, l'état publié n'est
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
    transport.send({
      type: 'open',
      players: currentRoster.map((s) => ({ id: s.id, name: s.name, bot: s.bot }))
    })
    startTurn()
  }

  function startTurn(): void {
    transient.value = ''
    selected.value = new Set()
    guardianDie.value = null
    // Le serveur ouvre les tours de lui-même : le lui demander serait au mieux
    // ignoré, au pire une course avec sa propre horloge.
    if (!remote) transport.send({ type: 'start-turn' })
    turnActor.value = currentPlayer.value?.name ?? ''
    mode.value = 'playing'
    restartTimer()
    if (!remote && currentPlayer.value?.bot) void runBot()
  }

  function afterAction(): void {
    // En distant, l'état n'est pas encore revenu du serveur au moment où l'on
    // passe ici : le lire donnerait une réponse périmée. Le `watch` ci-dessus
    // fait le travail quand la réponse arrive.
    if (remote) return
    // On NE vide PAS la sélection : les dés gardés le restent d'une relance à
    // l'autre (on ne relance que ceux laissés au centre).
    if (turn.value?.phase === 'ended') {
      mode.value = 'turnEnd'
      stopTimer()
    } else {
      // Une nouvelle décision commence : le joueur récupère tout son temps.
      restartTimer()
    }
  }

  /**
   * Enveloppe une commande du joueur. Le transport ne lève plus : une règle
   * refusée revient dans `lastError`, qu'on montre au joueur sans enchaîner sur
   * la suite du tour.
   */
  function human(send: () => void): void {
    if (botThinking.value) return
    send()
    transient.value = transport.lastError.value
    if (!transient.value) afterAction()
  }

  const act = (action: TurnAction) => transport.send({ type: 'act', action })

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
    const t = turn.value
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
    const t = turn.value
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
      human(() => act({ type: d.banked ? 'unbank' : 'bank', diceIds: [id] }))
      return
    }

    const s = new Set(selected.value)
    s.has(id) ? s.delete(id) : s.add(id)
    selected.value = s
  }

  const roll = () => human(() => act({ type: 'roll' }))
  const reroll = () =>
    human(() => {
      const g = guardianDie.value
      act({
        type: 'reroll',
        diceIds: eligibleReroll(),
        ...(g !== null ? { guardianDieId: g } : {})
      })
      guardianDie.value = null
    })
  const stop = () => human(() => act({ type: 'stop' }))

  /**
   * Action du bouton principal : il reste le même tout au long du tour.
   * Premier lancer / Île de la Tête-de-Mort → lancer ; sinon relancer les dés
   * non gardés.
   */
  const rollOrReroll = () => {
    if (rolling.value || botThinking.value) return
    const phase = turn.value?.phase
    if (phase !== 'first-roll' && phase !== 'island-roll' && phase !== 'decision') return
    rolling.value = true
    if (phase === 'decision') reroll()
    else roll()
    // Laisse le temps au jet d'être perçu (et plus tard, à l'animation 3D).
    setTimeout(() => (rolling.value = false), ROLL_MS)
  }

  const bank = () =>
    human(() =>
      act({
        type: 'bank',
        diceIds: [...selected.value].filter((id) => {
          const d = turn.value!.dice[id]!
          return !d.banked && d.face !== 'skull'
        })
      })
    )

  const unbank = () =>
    human(() =>
      act({
        type: 'unbank',
        diceIds: [...selected.value].filter((id) => turn.value!.dice[id]!.banked)
      })
    )

  function continueGame(): void {
    if (gamePhase.value === 'finished') {
      mode.value = 'finished'
      return
    }
    // En distant on ne fait que masquer le récapitulatif : le serveur a déjà
    // programmé le tour suivant, et l'état à venir rouvrira l'écran de jeu.
    if (remote) {
      mode.value = 'playing'
      return
    }
    startTurn()
  }

  /**
   * Tempo de l'IA. Elle décide à partir de l'état publié et passe par les mêmes
   * commandes qu'un joueur : le jour où elle tournera côté serveur, seul
   * l'endroit d'où partent ces commandes changera.
   */
  async function runBot(): Promise<void> {
    botThinking.value = true
    await sleep(650)
    let guard = 0
    while (turn.value && turn.value.phase !== 'ended' && guard++ < 200) {
      act(decideAction(turn.value, { difficulty: difficulty.value }))
      await sleep(750)
    }
    botThinking.value = false
    mode.value = 'turnEnd'
    stopTimer()
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
