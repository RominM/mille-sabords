/**
 * Lien avec le serveur autoritaire : une salle, sa composition, puis sa partie.
 *
 * État et socket sont au niveau du MODULE, donc partagés : la connexion doit
 * survivre au passage du lobby au plateau. Un état par composant couperait la
 * partie à chaque navigation.
 *
 * Le composable ne décide de rien — il envoie des intentions et publie ce que le
 * serveur répond. Toute règle refusée revient par `error`, jamais par une
 * exception : c'est une réponse, pas un incident.
 */
import type { ClientMessage, LobbyView, SeatView, ServerMessage } from '@rf/protocol'
import type { BotDifficulty, GameState } from '@rf/engine'

/** Clé du jeton d'identité : c'est lui qui rend son siège au joueur. */
const TOKEN_KEY = 'rf-player-token'
/** Dernière salle et dernier pirate, pour se reconnecter seul après un F5. */
const LAST_ROOM_KEY = 'rf-last-room'

export interface Pirate {
  name: string
  avatar: string
}

/**
 * Jeton opaque identifiant un joueur, rangé dans `sessionStorage` — donc par
 * ONGLET, et non par navigateur.
 *
 * `localStorage` serait partagé entre tous les onglets d'un même navigateur :
 * deux onglets seraient le même joueur, se voleraient leur siège, et il
 * deviendrait impossible de tester une partie à plusieurs sur un seul poste.
 *
 * Le compromis est net : le jeton survit à un F5 et à un plantage de la page —
 * ce qu'on veut pour la reprise — mais pas à la fermeture de l'onglet. Fermer,
 * c'est quitter la table.
 */
function playerToken(): string {
  if (!import.meta.client) return ''
  let token = sessionStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    sessionStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export type RoomStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error'

// ── État partagé ─────────────────────────────────────────────────────────────
const lobby = ref<LobbyView | null>(null)
/**
 * Composition de la table — portraits compris. Séparée de `lobby` parce qu'elle
 * SURVIT au départ vers le plateau : en partie, le serveur n'émet plus de vue de
 * salle, et l'écran de jeu n'aurait plus de quoi dessiner les visages après un
 * rechargement.
 */
const roster = ref<SeatView[]>([])
const gameState = shallowRef<GameState | null>(null)
const youId = ref<string | null>(null)
const code = ref('')
const error = ref('')
const status = ref<RoomStatus>('idle')

let socket: WebSocket | null = null

/** Ce qu'il faut pour se reconnecter tout seul : la salle et qui on y est. */
function remember(pirate: Pirate, roomCode: string): void {
  if (!import.meta.client) return
  sessionStorage.setItem(LAST_ROOM_KEY, JSON.stringify({ ...pirate, code: roomCode }))
}

export function lastRoom(): (Pirate & { code: string }) | null {
  if (!import.meta.client) return null
  try {
    return JSON.parse(sessionStorage.getItem(LAST_ROOM_KEY) ?? 'null')
  } catch {
    return null
  }
}

export const useRoom = () => {
  const send = (msg: ClientMessage): void => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg))
  }

  function receive(msg: ServerMessage, pirate: Pirate): void {
    switch (msg.t) {
      case 'joined':
        code.value = msg.code
        youId.value = msg.youId
        error.value = ''
        // On ne mémorise qu'une salle RÉELLEMENT rejointe : un code refusé ne
        // doit pas nous faire reconnecter en boucle sur une salle fantôme.
        remember(pirate, msg.code)
        return
      case 'lobby':
        lobby.value = msg.lobby
        roster.value = msg.lobby.seats
        status.value = 'lobby'
        return
      case 'roster':
        roster.value = msg.seats
        return
      case 'state':
        gameState.value = msg.game
        youId.value = msg.youId
        status.value = 'playing'
        return
      case 'error':
        error.value = msg.message
        return
    }
  }

  /**
   * Adresse du serveur.
   *
   * Réglée par `NUXT_PUBLIC_WS_URL`, sans reconstruction : changer d'hébergeur
   * ne demande qu'une variable d'environnement. À défaut, on vise l'hôte qui a
   * servi la page — le cas quand front et serveur partagent un domaine. Le
   * schéma suit celui de la page : `wss` en HTTPS, sinon le navigateur refuse
   * la connexion pour contenu mixte.
   */
  function serverUrl(): string {
    const configured = useRuntimeConfig().public.wsUrl
    if (configured) return configured
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
    return `${scheme}://${location.host}`
  }

  /**
   * Ouvre la connexion et demande une place. Sans `roomCode`, le serveur crée
   * une salle et renvoie son code ; avec, il fait rejoindre — ou refuse.
   *
   * `create` dit que le code vient de l'hôte lui-même : la salle est alors
   * ouverte à ce code-là, qu'il a pu partager avant même d'embarquer.
   */
  function connect(pirate: Pirate, roomCode?: string, create = false): void {
    close()
    status.value = 'connecting'
    error.value = ''
    socket = new WebSocket(serverUrl())

    socket.addEventListener('open', () => {
      send({
        t: 'join',
        ...(roomCode ? { code: roomCode.toUpperCase() } : {}),
        ...(create ? { create: true } : {}),
        token: playerToken(),
        name: pirate.name,
        avatar: pirate.avatar
      })
    })

    socket.addEventListener('message', (event) => {
      try {
        receive(JSON.parse(String(event.data)) as ServerMessage, pirate)
      } catch {
        error.value = 'Réponse illisible du serveur'
      }
    })

    socket.addEventListener('close', () => {
      // Une coupure n'efface pas l'état affiché : le joueur voit sa dernière
      // vue connue pendant qu'il se reconnecte, plutôt qu'un écran vide.
      if (status.value !== 'error') status.value = 'idle'
    })

    socket.addEventListener('error', () => {
      error.value = 'Connexion au serveur impossible'
      status.value = 'error'
    })
  }

  /** Reprend la dernière salle connue. Rend `false` s'il n'y a rien à reprendre. */
  function resume(): boolean {
    const last = lastRoom()
    if (!last?.code) return false
    connect({ name: last.name, avatar: last.avatar }, last.code)
    return true
  }

  function close(): void {
    socket?.close()
    socket = null
  }

  const connected = computed(() => status.value === 'lobby' || status.value === 'playing')

  // ── Intentions de la salle d'attente ───────────────────────────────────────
  const setReady = (ready: boolean) => send({ t: 'ready', ready })
  const addBot = () => send({ t: 'add-bot' })
  const removeSeat = (seatId: string) => send({ t: 'remove-seat', seatId })
  const setDifficulty = (value: BotDifficulty) => send({ t: 'difficulty', value })
  const start = () => send({ t: 'start' })

  /** Vrai si c'est TOI qui règles la partie. */
  const isHost = computed(() => !!youId.value && lobby.value?.hostId === youId.value)
  /** Ton propre siège, pour savoir si tu t'es déjà déclaré paré. */
  const mySeat = computed(() => lobby.value?.seats.find((s) => s.id === youId.value) ?? null)

  return {
    status,
    connected,
    code,
    youId,
    lobby,
    roster,
    gameState,
    error,
    isHost,
    mySeat,
    connect,
    resume,
    close,
    send,
    setReady,
    addBot,
    removeSeat,
    setDifficulty,
    start
  }
}
