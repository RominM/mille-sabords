/**
 * Une salle : sa composition, puis la partie qu'elle arbitre.
 *
 * Classe PURE — aucun socket, aucun minuteur. Le temps entre par `tick(now)` et
 * les messages sortent par `emit`. C'est ce qui la rend testable au tour près,
 * et c'est aussi ce qui garantit qu'aucun client ne peut faire avancer la partie
 * de son côté : démarrer un tour, expirer une décision et jouer les IA sont des
 * décisions du SERVEUR.
 */
import {
  decideAction,
  DECISION_TIMEOUT_MS,
  Game,
  IllegalActionError,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type BotDifficulty,
  type GameState
} from '@rf/engine'
import type { ClientMessage, LobbyView, SeatView, ServerMessage } from '@rf/protocol'

/** Temps laissé au récapitulatif de fin de tour avant d'enchaîner. */
export const RECAP_MS = 3_500
/** Cadence de l'IA : assez lente pour qu'on suive ce qu'elle fait. */
export const BOT_STEP_MS = 800
/** Un siège déconnecté avant le départ finit par libérer sa place. */
export const LOBBY_GRACE_MS = 30_000

interface Seat {
  id: string
  /** Secret du joueur : c'est lui qui lui rend sa place après un rechargement. */
  token: string
  name: string
  avatar: string
  bot: boolean
  ready: boolean
  connected: boolean
  /** Instant de la déconnexion, pour le délai de grâce en salle d'attente. */
  goneAt: number | null
}

export type Emit = (target: 'all' | string, msg: ServerMessage) => void

/**
 * Tout ce qu'il faut pour ressusciter une salle après un redémarrage.
 *
 * Volontairement du JSON nu : la salle ne sait pas où il finit — fichier
 * aujourd'hui, base demain — et le module qui l'écrit ne sait rien des règles.
 * Les jetons y figurent : sans eux, personne ne retrouverait son siège, ce qui
 * est tout l'objet de la reprise.
 */
export interface RoomSnapshot {
  code: string
  seats: Seat[]
  hostId: string | null
  difficulty: BotDifficulty
  seq: number
  game: GameState
  /** Instant de l'écriture : on ne ressuscite pas une salle d'avant-hier. */
  savedAt: number
}

export class Room {
  readonly code: string
  private seats: Seat[] = []
  private hostId: string | null = null
  private difficulty: BotDifficulty = 'medium'
  private game: Game | null = null
  private now = 0
  /** Prochaine échéance interne : enchaînement de tour ou coup de l'IA. */
  private nextStepAt = 0
  private seq = 0
  /** Dernière composition diffusée : on ne réémet que si elle a changé. */
  private rosterSent = ''

  constructor(
    code: string,
    private emit: Emit
  ) {
    this.code = code
  }

  // ── Persistance ────────────────────────────────────────────────────────────

  /**
   * Photographie de la salle, ou `null` si elle n'a rien à sauver.
   *
   * Seules les parties LANCÉES valent d'être reprises : une salle d'attente se
   * recompose en dix secondes, et ses sièges auraient de toute façon expiré
   * pendant le redémarrage.
   *
   * `savedAt` vient de l'horloge injectée par `tick`, que la coquille réseau
   * fait battre en continu : la salle, elle, n'a pas de montre.
   */
  snapshot(): RoomSnapshot | null {
    if (!this.game) return null
    return {
      code: this.code,
      seats: this.seats.map((s) => ({ ...s })),
      hostId: this.hostId,
      difficulty: this.difficulty,
      seq: this.seq,
      game: this.game.state,
      savedAt: this.now
    }
  }

  /** Ressuscite une salle sauvegardée. Les joueurs reviendront avec leur jeton. */
  static restore(snap: RoomSnapshot, emit: Emit, now: number): Room {
    const room = new Room(snap.code, emit)
    room.hostId = snap.hostId
    room.difficulty = snap.difficulty
    room.seq = snap.seq
    room.now = now

    // Aucun socket n'a survécu au redémarrage : tout le monde est réputé parti,
    // et chacun retrouvera son siège en se reconnectant avec son jeton.
    room.seats = snap.seats.map((s) => ({
      ...s,
      connected: s.bot,
      goneAt: s.bot ? null : now
    }))

    room.game = Game.resume(snap.game, { now: () => room.now })
    // Le redémarrage n'est pas la faute du joueur actif : sa décision repart
    // avec tout son temps, sinon il perdrait son tour avant même d'avoir revu
    // le plateau.
    if (room.game.state.decisionDeadline !== null) {
      room.game.state.decisionDeadline = now + DECISION_TIMEOUT_MS
    }
    // Les échéances internes se RECALCULENT : les persister n'aurait aucun sens,
    // elles se comptent depuis un « maintenant » qui n'existe plus.
    room.scheduleNextStep()
    return room
  }

  // ── Lecture ────────────────────────────────────────────────────────────────

  get isEmpty(): boolean {
    return this.seats.every((s) => s.bot || !s.connected)
  }

  get started(): boolean {
    return this.game !== null
  }

  private view(): LobbyView {
    return {
      code: this.code,
      hostId: this.hostId,
      difficulty: this.difficulty,
      started: this.started,
      seats: this.seats.map<SeatView>((s) => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        bot: s.bot,
        ready: s.ready,
        connected: s.connected
      }))
    }
  }

  private publish(): void {
    if (this.game) {
      // Portraits et présences ne sont pas dans l'état de jeu — le moteur n'en a
      // que faire. On les diffuse à côté, et seulement quand ils changent : la
      // composition bouge une fois par déconnexion, l'état à chaque coup.
      this.publishRoster()
      // En partie, chaque joueur reçoit l'état ET son propre identifiant : c'est
      // ainsi qu'il sait si c'est à lui de jouer.
      for (const s of this.seats) {
        if (!s.bot && s.connected) this.emit(s.id, { t: 'state', game: this.game.state, youId: s.id })
      }
      return
    }
    this.emit('all', { t: 'lobby', lobby: this.view() })
  }

  private publishRoster(): void {
    const seats = this.view().seats
    const signature = JSON.stringify(seats)
    if (signature === this.rosterSent) return
    this.rosterSent = signature
    this.emit('all', { t: 'roster', seats })
  }

  private fail(seatId: string, message: string): void {
    this.emit(seatId, { t: 'error', message })
  }

  private seatOf(id: string): Seat | undefined {
    return this.seats.find((s) => s.id === id)
  }

  // ── Connexion ──────────────────────────────────────────────────────────────

  /**
   * Rattache un jeton à un siège. Renvoie l'identifiant public du siège, ou
   * `null` si l'entrée est refusée — salle pleine, ou partie déjà lancée pour
   * quelqu'un qui n'y avait pas de place.
   *
   * `attach` est appelé AVANT le premier message : la coquille réseau doit avoir
   * associé le socket au siège, sans quoi l'accueil partirait vers un
   * destinataire qu'elle ne connaît pas encore.
   */
  join(
    token: string,
    name: string,
    avatar: string,
    now: number,
    attach: (seatId: string) => void = () => {}
  ): string | null {
    this.now = now

    // Retour d'un joueur connu : il retrouve sa place et ses points.
    const known = this.seats.find((s) => s.token === token)
    if (known) {
      known.connected = true
      known.goneAt = null
      attach(known.id)
      // Celui qui revient n'a plus rien en mémoire : il lui faut la composition
      // complète, même si elle n'a pas bougé pour les autres.
      this.rosterSent = ''
      this.emit(known.id, { t: 'joined', code: this.code, youId: known.id })
      this.publish()
      return known.id
    }

    // La partie est lancée : on n'ajoute plus de joueur en cours de route.
    if (this.started) return null
    if (this.seats.length >= MAX_PLAYERS) return null

    const seat: Seat = {
      id: `s${++this.seq}`,
      token,
      name,
      avatar,
      bot: false,
      ready: false,
      connected: true,
      goneAt: null
    }
    this.seats.push(seat)
    // Le premier humain arrivé règle la partie.
    if (this.hostId === null) this.hostId = seat.id

    attach(seat.id)
    this.emit(seat.id, { t: 'joined', code: this.code, youId: seat.id })
    this.publish()
    return seat.id
  }

  leave(seatId: string, now: number): void {
    this.now = now
    const seat = this.seatOf(seatId)
    if (!seat) return
    seat.connected = false
    seat.goneAt = now
    seat.ready = false

    // « La partie continue sans lui » : en cours de jeu le siège reste, avec ses
    // points, et le minuteur fera avancer les tours. Seule la salle d'attente
    // transfère les droits de réglage, sans quoi elle serait bloquée.
    if (!this.started && this.hostId === seatId) this.passHost()
    this.publish()
  }

  private passHost(): void {
    const next = this.seats.find((s) => !s.bot && s.connected)
    this.hostId = next?.id ?? null
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  handle(seatId: string, msg: ClientMessage, now: number): void {
    this.now = now
    const seat = this.seatOf(seatId)
    if (!seat) return

    switch (msg.t) {
      case 'ready':
        if (this.started) return
        seat.ready = msg.ready
        return this.publish()

      case 'difficulty':
        if (!this.isHost(seatId)) return this.fail(seatId, 'Seul l’hôte règle la partie')
        this.difficulty = msg.value
        return this.publish()

      case 'add-bot': {
        if (!this.isHost(seatId)) return this.fail(seatId, 'Seul l’hôte peut ajouter une IA')
        if (this.started) return this.fail(seatId, 'La partie a déjà commencé')
        if (this.seats.length >= MAX_PLAYERS) return this.fail(seatId, 'La table est complète')
        const n = this.seats.filter((s) => s.bot).length + 1
        this.seats.push({
          id: `s${++this.seq}`,
          token: `bot-${this.seq}`,
          name: `Corsaire ${n}`,
          avatar: '',
          bot: true,
          ready: true,
          connected: true,
          goneAt: null
        })
        return this.publish()
      }

      case 'remove-seat': {
        if (!this.isHost(seatId)) return this.fail(seatId, 'Seul l’hôte peut retirer un siège')
        if (this.started) return this.fail(seatId, 'La partie a déjà commencé')
        const target = this.seatOf(msg.seatId)
        // On ne retire que les IA : un joueur part de lui-même.
        if (!target?.bot) return this.fail(seatId, 'Seules les IA peuvent être retirées')
        this.seats = this.seats.filter((s) => s.id !== msg.seatId)
        return this.publish()
      }

      case 'start':
        return this.start(seatId)

      case 'act':
        return this.act(seatId, msg)
    }
  }

  private isHost(seatId: string): boolean {
    return this.hostId === seatId
  }

  private start(seatId: string): void {
    if (!this.isHost(seatId)) return this.fail(seatId, 'Seul l’hôte lance la partie')
    if (this.started) return this.fail(seatId, 'La partie a déjà commencé')

    const humans = this.seats.filter((s) => !s.bot)
    if (this.seats.length < MIN_PLAYERS) return this.fail(seatId, `Il faut au moins ${MIN_PLAYERS} pirates`)
    if (!humans.every((s) => s.ready)) return this.fail(seatId, 'Tout l’équipage doit être paré')

    this.game = new Game(
      this.seats.map((s) => ({ id: s.id, name: s.name, bot: s.bot })),
      { now: () => this.now }
    )
    this.beginTurn()
  }

  private act(seatId: string, msg: Extract<ClientMessage, { t: 'act' }>): void {
    if (!this.game) return this.fail(seatId, 'Aucune partie en cours')
    // Le cœur de l'arbitrage : on ne croit pas le client sur parole quant à
    // savoir si c'est son tour.
    if (this.game.currentPlayer.id !== seatId) return this.fail(seatId, 'Ce n’est pas ton tour')
    if (this.game.state.turn?.phase === 'ended') return

    try {
      this.game.act(msg.action)
    } catch (err) {
      if (!(err instanceof IllegalActionError)) throw err
      return this.fail(seatId, err.message)
    }
    this.afterGameChange()
  }

  // ── Déroulement, piloté par le serveur ─────────────────────────────────────

  private beginTurn(): void {
    this.game!.startTurn()
    this.afterGameChange()
  }

  /** Programme la prochaine échéance interne, sans rien publier. */
  private scheduleNextStep(): void {
    const game = this.game!
    const turn = game.state.turn

    if (game.state.phase === 'finished') {
      this.nextStepAt = 0
    } else if (!turn || turn.phase === 'ended') {
      // Laisser le récapitulatif à l'écran, puis enchaîner de nous-mêmes : aucun
      // client ne doit pouvoir bloquer la table en ne cliquant pas.
      this.nextStepAt = this.now + RECAP_MS
    } else if (game.currentPlayer.bot) {
      this.nextStepAt = this.now + BOT_STEP_MS
    } else {
      this.nextStepAt = 0 // c'est au joueur ; seul son minuteur court
    }
  }

  /** Publie et programme la prochaine échéance interne. */
  private afterGameChange(): void {
    this.scheduleNextStep()
    this.publish()
  }

  /** Fait avancer le temps. À appeler régulièrement par la coquille réseau. */
  tick(now: number): void {
    this.now = now

    if (!this.game) {
      // Salle d'attente : une place quittée finit par se libérer.
      const before = this.seats.length
      this.seats = this.seats.filter(
        (s) => s.connected || s.bot || s.goneAt === null || now - s.goneAt < LOBBY_GRACE_MS
      )
      if (this.seats.length !== before) {
        if (!this.seats.some((s) => s.id === this.hostId)) this.passHost()
        this.publish()
      }
      return
    }

    if (this.game.state.phase === 'finished') return
    const turn = this.game.state.turn

    if (!turn || turn.phase === 'ended') {
      if (this.nextStepAt && now >= this.nextStepAt) this.beginTurn()
      return
    }

    if (this.game.currentPlayer.bot) {
      if (this.nextStepAt && now >= this.nextStepAt) {
        this.game.act(decideAction(turn, { difficulty: this.difficulty }))
        this.afterGameChange()
      }
      return
    }

    // Joueur humain : le minuteur de décision du moteur fait autorité.
    if (this.game.isTimedOut()) {
      this.game.timeout()
      this.afterGameChange()
    }
  }
}
