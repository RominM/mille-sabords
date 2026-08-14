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
  totalSkulls,
  WINNING_SCORE,
  type BotDifficulty,
  type DieFace,
  type TurnAction,
  type TurnState
} from '@rf/engine'
import { RECAP_MS } from '@rf/protocol'

export type Mode = 'start' | 'playing' | 'turnEnd' | 'finished'

/** Nombre maximum de dés en l'air, pour borner l'attente de la volée. */
const MAX_DICE = 8

/** Le temps que l'IA « prend sa décision » avant son premier geste du tour. */
const BOT_THINK_MS = 900
/** Le temps qu'elle laisse au joueur pour lire les dés, une fois posés. */
const BOT_READ_MS = 1_100

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function useGame(transport: GameTransport = createLocalTransport()) {
  const snapshot = transport.state
  /** Vrai quand le serveur pilote le déroulement : on obéit au lieu de mener. */
  const remote = transport.remote

  const mode = ref<Mode>('start')
  const difficulty = ref<BotDifficulty>('medium')
  const selected = ref<Set<number>>(new Set())

  /**
   * Quel dé occupe quel emplacement du bas : `slots[i]` = identifiant du dé, ou
   * `null`. C'est de la MISE EN SCÈNE, pas une règle — le moteur se moque de
   * savoir dans quel cadre un dé est rangé. Mais un joueur, lui, aime regrouper
   * ses dés, et le glisser-déposer ne veut rien dire sans cette table.
   */
  const slots = ref<(number | null)[]>(Array(MAX_DICE).fill(null))

  const slotOfDie = (id: number): number => slots.value.indexOf(id)

  /**
   * Range un dé dans un emplacement précis. Si la place est prise, les deux dés
   * ÉCHANGENT : c'est le geste attendu quand on réorganise à la main, et ça
   * évite d'avoir à vider une case avant de la remplir.
   */
  function moveToSlot(dieId: number, target: number): void {
    if (target < 0 || target >= MAX_DICE) return
    const next = [...slots.value]
    const from = next.indexOf(dieId)
    const occupant = next[target] ?? null

    if (from !== -1) next[from] = occupant
    else if (occupant !== null) {
      // Le dé arrive du plateau et la case est prise : l'occupant retourne au
      // premier creux libre plutôt que d'être renvoyé au centre.
      const free = next.indexOf(null)
      if (free !== -1) next[free] = occupant
    }
    next[target] = dieId
    slots.value = next
  }

  /**
   * Aligne la table des emplacements sur les dés réellement gardés. Certains le
   * deviennent SANS clic — une tête de mort se verrouille toute seule —, et un
   * dé relancé libère sa place. Les positions choisies à la main survivent.
   */
  function syncSlots(kept: number[]): void {
    const next = slots.value.map((id) => (id !== null && kept.includes(id) ? id : null))
    for (const id of kept) {
      if (next.includes(id)) continue
      const free = next.indexOf(null)
      if (free !== -1) next[free] = id
    }
    slots.value = next
  }
  /** Tête de mort désignée pour la relance exceptionnelle de la Gardienne. */
  const guardianDie = ref<number | null>(null)
  const botThinking = ref(false)
  const turnActor = ref('')
  const transient = ref('')
  /** Vrai pendant le jet de dés : les boutons d'action sont alors inactifs. */
  const rolling = ref(false)
  // Le temps que la volée entière retombe, dernier dé compris. Il se déduit du
  // réglage du jet : une seule source, sinon les cachets se rallument sous des
  // dés encore en train de rouler.
  const ROLL_MS = DICE_THROW.duration + (MAX_DICE - 1) * DICE_THROW.stagger

  // Lectures réactives (sur l'état publié par le transport).
  const turn = computed<TurnState | null>(() => snapshot.value?.turn ?? null)
  const players = computed(() => snapshot.value?.players ?? [])
  const currentIndex = computed(() => snapshot.value?.currentPlayerIndex ?? 0)
  const currentPlayer = computed(() => players.value[currentIndex.value] ?? null)
  /**
   * Dés GARDÉS : ceux choisis par le joueur, plus les têtes de mort
   * (verrouillées, donc gardées d'office) et les dés réservés de l'Île au
   * Trésor. La définition vit ici et non dans l'écran : la table des
   * emplacements doit s'y accrocher, et deux définitions divergeraient.
   */
  const keptIds = computed(() => {
    const t = turn.value
    if (!t) return []
    return t.dice
      .filter(
        (d) =>
          d.face !== null &&
          (d.banked ||
            selected.value.has(d.id) ||
            // Une tête de mort QUI VIENT DE SORTIR reste au centre le temps du
            // vol : c'est la face qu'on veut voir tomber, elle ne doit pas
            // sauter dans son cadre avant d'avoir fini de rouler.
            //
            // Celles des tours précédents, elles, ne bougent plus : sans cette
            // distinction, chaque relance faisait ressortir de leur cadre des
            // têtes déjà rangées, pour les y remettre une seconde plus tard.
            (d.locked && (!rolling.value || lockedBeforeThrow.value.includes(d.id))))
      )
      .map((d) => d.id)
  })

  watch(keptIds, syncSlots, { immediate: true })

  const history = computed(() => snapshot.value?.history ?? [])
  const gamePhase = computed(() => snapshot.value?.phase ?? 'playing')
  const winner = computed(() => players.value.find((p) => p.id === snapshot.value?.winnerId) ?? null)

  // ── Détection des jets ──────────────────────────────────────────────────────
  /**
   * Compteur de jets, qui déclenche l'animation des dés.
   *
   * Il se DÉDUIT de l'état plutôt que d'être posé au moment du clic, et c'est
   * volontaire : personne ne reçoit d'événement « lancer ». En multi, les
   * adversaires et les spectateurs ne voient que l'état arriver — déduire le
   * jet est la seule façon que tout le monde voie rouler les mêmes dés.
   */
  const rollSeq = ref(0)
  let knownFaces: (DieFace | null)[] = []
  let facesSeen = false

  /**
   * Têtes de mort déjà verrouillées AVANT le jet en cours.
   *
   * Il faut la photo d'AVANT : quand on l'apprend, l'état porte déjà les
   * nouvelles têtes, et rien ne distingue plus celle qui vient de tomber de
   * celle qui dort dans son cadre depuis deux relances.
   *
   * `ref` et non une simple variable : `keptIds` la lit, et un `computed` ne se
   * recalcule que sur ses dépendances RÉACTIVES. En variable ordinaire, la
   * valeur utilisée était celle du dernier recalcul — donc périmée une fois sur
   * deux, et les têtes déjà rangées ressortaient quand même.
   */
  const lockedBeforeThrow = ref<number[]>([])
  let lockedNow: number[] = []

  /**
   * Arme le drapeau « des dés sont en l'air ».
   *
   * Il se déduit du jet, et non du clic : en multi, les autres joueurs ne
   * cliquent rien mais doivent voir la même volée voler pendant la même durée.
   */
  let rollTimer: ReturnType<typeof setTimeout> | null = null
  function markRolling(): void {
    rolling.value = true
    if (rollTimer) clearTimeout(rollTimer)
    rollTimer = setTimeout(() => {
      rolling.value = false
      rollTimer = null
    }, ROLL_MS)
  }

  watch(
    turn,
    (t) => {
      const faces = t ? t.dice.map((d) => d.face) : []
      // Premier passage : on prend l'état tel quel. Sinon un rechargement en
      // pleine partie relancerait les dés déjà posés sur la table.
      if (!facesSeen) {
        facesSeen = true
        knownFaces = faces
        return
      }
      // Une face qui APPARAÎT ou qui CHANGE ne peut venir que d'un jet. Un dé
      // retombé sur la même face passerait inaperçu ici — mais ses voisins,
      // non : on anime la volée entière, pas dé par dé.
      if (faces.some((face, i) => face !== null && face !== knownFaces[i])) {
        // On retient le verrouillage tel qu'il était AVANT ce jet : c'est lui
        // qui dit quelles têtes restent dans leur cadre pendant le vol.
        lockedBeforeThrow.value = lockedNow
        rollSeq.value += 1
        markRolling()
      }
      knownFaces = faces
      lockedNow = t ? t.dice.filter((d) => d.locked).map((d) => d.id) : []
    },
    { immediate: true }
  )

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
  /**
   * Décompte SUSPENDU. Le tutoriel s'en sert pour laisser lire : on gèle la
   * valeur au lieu de couper le minuteur, sinon il faudrait le relancer à la
   * main — et la moindre reprise oubliée rendrait le tour éternel.
   *
   * Le mode distant l'ignore : là-bas c'est le serveur qui expire les
   * décisions, et rien de local ne peut suspendre son horloge.
   */
  const paused = ref(false)
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
      if (paused.value) return
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
    if (rollTimer) clearTimeout(rollTimer)
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
    slots.value = Array(MAX_DICE).fill(null)
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
    // À 3 têtes, le moteur emmène LUI-MÊME une tête dans la relance : un seul
    // autre dé suffit alors à la rendre légale.
    const rescue = t.guardianAvailable && totalSkulls(t) >= 3 ? 1 : 0
    if (ids.length + rescue < 2 || ids.length >= t.dice.length) return []
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
    // On arme tout de suite, sans attendre la réponse : en distant, l'état met
    // un aller-retour à revenir, et le cachet doit s'éteindre au clic. Le
    // détecteur de jet réarmera ensuite sur la volée réellement observée.
    markRolling()
    if (phase === 'decision') reroll()
    else roll()
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

  /**
   * Le résultat du tour s'efface tout seul.
   *
   * Il n'y a plus rien à décider une fois le tour joué : demander un clic pour
   * enchaîner ne servait qu'à retarder la partie. Le compte à rebours est celui
   * du serveur (`RECAP_MS`, partagé) — l'écran doit se libérer au moment même où
   * le tour suivant s'ouvre, pas avant, pas après.
   */
  let recapTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Le résultat ne se montre qu'une fois les dés retombés.
   *
   * Le moteur, lui, a déjà tout tranché à l'instant du jet : sans cette
   * attente, « trois têtes — tour perdu » s'afficherait pendant que les dés
   * roulent encore, et annoncerait au joueur ce qu'il est en train de regarder.
   */
  const showResult = computed(() => mode.value === 'turnEnd' && !rolling.value)

  watch(showResult, (visible) => {
    if (recapTimer) clearTimeout(recapTimer)
    recapTimer = null
    if (!visible) return
    recapTimer = setTimeout(continueGame, RECAP_MS)
  })

  onScopeDispose(() => {
    if (recapTimer) clearTimeout(recapTimer)
  })

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
  /**
   * Attend que les dés soient POSÉS.
   *
   * L'IA décide en une microseconde ; le joueur, lui, regarde. Sans cette
   * attente elle relançait par-dessus ses propres dés encore en vol, et on ne
   * voyait jamais ce qu'elle avait obtenu.
   */
  async function waitForDice(): Promise<void> {
    while (rolling.value) await sleep(80)
  }

  async function runBot(): Promise<void> {
    botThinking.value = true
    await sleep(BOT_THINK_MS)
    let guard = 0
    while (turn.value && turn.value.phase !== 'ended' && guard++ < 200) {
      act(decideAction(turn.value, { difficulty: difficulty.value }))
      await waitForDice()
      // Un temps APRÈS que les dés se sont posés : c'est là qu'on lit le
      // résultat, et l'IA doit avoir l'air d'y réfléchir avant d'enchaîner.
      await sleep(BOT_READ_MS)
    }
    botThinking.value = false
    mode.value = 'turnEnd'
    stopTimer()
  }

  return {
    WINNING_SCORE,
    TURN_SECONDS,
    secondsLeft,
    paused,
    mode,
    difficulty,
    selected,
    slots,
    keptIds,
    moveToSlot,
    botThinking,
    rolling,
    showResult,
    rollSeq,
    turnActor,
    transient,
    turn,
    players,
    history,
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
