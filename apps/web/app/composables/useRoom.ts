/**
 * Lien avec le serveur autoritaire : une salle, sa composition, puis sa partie.
 *
 * Le composable ne décide de rien — il envoie des intentions et publie ce que le
 * serveur répond. Toute règle refusée revient par `error`, jamais par une
 * exception : c'est une réponse, pas un incident.
 */
import type { ClientMessage, LobbyView, ServerMessage } from '@rf/protocol'
import type { BotDifficulty, GameState } from '@rf/engine'

/** Clé du jeton d'identité : c'est lui qui rend son siège au joueur. */
const TOKEN_KEY = 'rf-player-token'

/**
 * Jeton opaque, stable pour ce navigateur. Il n'identifie pas une personne mais
 * une INSTALLATION : depuis un autre navigateur ou en navigation privée, le
 * joueur sera un inconnu. C'est le compromis assumé — l'alternative « code +
 * pseudo » laisserait n'importe qui reprendre la place d'un autre.
 */
function playerToken(): string {
  if (!import.meta.client) return ''
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export type RoomStatus = 'idle' | 'connecting' | 'lobby' | 'playing' | 'error'

export const useRoom = () => {
  const lobby = ref<LobbyView | null>(null)
  const gameState = shallowRef<GameState | null>(null)
  const youId = ref<string | null>(null)
  const code = ref('')
  const error = ref('')
  const status = ref<RoomStatus>('idle')

  let socket: WebSocket | null = null
  /** Intention mise en attente le temps que la connexion s'ouvre. */
  let pending: ClientMessage | null = null

  const send = (msg: ClientMessage): void => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg))
    else pending = msg
  }

  function receive(msg: ServerMessage): void {
    switch (msg.t) {
      case 'joined':
        code.value = msg.code
        youId.value = msg.youId
        error.value = ''
        return
      case 'lobby':
        lobby.value = msg.lobby
        status.value = 'lobby'
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
   * Ouvre la connexion et demande une place. Sans `roomCode`, le serveur crée
   * une salle et renvoie son code ; avec, il fait rejoindre — ou refuse.
   */
  function connect(url: string, pirate: { name: string; avatar: string }, roomCode?: string): void {
    close()
    status.value = 'connecting'
    error.value = ''
    socket = new WebSocket(url)

    socket.addEventListener('open', () => {
      send({
        t: 'join',
        ...(roomCode ? { code: roomCode.toUpperCase() } : {}),
        token: playerToken(),
        name: pirate.name,
        avatar: pirate.avatar
      })
      if (pending) {
        socket!.send(JSON.stringify(pending))
        pending = null
      }
    })

    socket.addEventListener('message', (event) => {
      try {
        receive(JSON.parse(String(event.data)) as ServerMessage)
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

  function close(): void {
    socket?.close()
    socket = null
    pending = null
  }

  onScopeDispose(close)

  // ── Intentions de la salle d'attente ───────────────────────────────────────
  const setReady = (ready: boolean) => send({ t: 'ready', ready })
  const addBot = () => send({ t: 'add-bot' })
  const removeSeat = (seatId: string) => send({ t: 'remove-seat', seatId })
  const setDifficulty = (value: BotDifficulty) => send({ t: 'difficulty', value })
  const start = () => send({ t: 'start' })

  /** Vrai si c'est TOI qui règles la partie. */
  const isHost = computed(() => !!youId.value && lobby.value?.hostId === youId.value)

  return {
    status,
    code,
    youId,
    lobby,
    gameState,
    error,
    isHost,
    connect,
    close,
    send,
    setReady,
    addBot,
    removeSeat,
    setDifficulty,
    start
  }
}
