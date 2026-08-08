/**
 * Coquille réseau : elle ne connaît AUCUNE règle.
 *
 * Son rôle se limite à router les messages vers la bonne salle, à faire battre
 * le temps, et à ramasser les salles vides. Toute la logique vit dans `Room`,
 * qui est pure et testée sans socket.
 */
import { WebSocketServer, type WebSocket } from 'ws'
import { Room } from './room.js'
import type { ClientMessage, ServerMessage } from '@rf/protocol'

const PORT = Number(process.env.PORT ?? 8787)
/** Cadence du battement : assez fine pour un minuteur à la seconde. */
const TICK_MS = 500

/** Codes sans I, O, 0 ni 1 : ils se dictent à l'oral sans ambiguïté. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const makeCode = (): string =>
  Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

const rooms = new Map<string, Room>()
/** Sockets d'une salle, par identifiant de siège. */
const sockets = new Map<string, Map<string, WebSocket>>()

interface Session {
  code: string
  seatId: string
}
const sessions = new WeakMap<WebSocket, Session>()

const send = (ws: WebSocket, msg: ServerMessage): void => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

function emitFor(code: string) {
  return (target: 'all' | string, msg: ServerMessage): void => {
    const peers = sockets.get(code)
    if (!peers) return
    if (target === 'all') {
      for (const ws of peers.values()) send(ws, msg)
      return
    }
    const ws = peers.get(target)
    if (ws) send(ws, msg)
  }
}

function freshCode(): string {
  let code = makeCode()
  while (rooms.has(code)) code = makeCode()
  return code
}

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(String(raw)) as ClientMessage
    } catch {
      return send(ws, { t: 'error', message: 'Message illisible' })
    }
    const now = Date.now()

    if (msg.t === 'join') {
      const code = msg.code?.toUpperCase() ?? freshCode()
      let room = rooms.get(code)
      if (!room) {
        // On ne crée que pour celui qui n'a pas donné de code : un code inconnu
        // est une faute de frappe, pas une invitation à ouvrir une salle.
        if (msg.code) return send(ws, { t: 'error', message: 'Aucune salle avec ce code' })
        room = new Room(code, emitFor(code))
        rooms.set(code, room)
        sockets.set(code, new Map())
      }

      // Le socket est associé au siège AVANT que la salle n'émette quoi que ce
      // soit, sinon l'accueil part vers un destinataire encore inconnu d'ici.
      const seatId = room.join(msg.token, msg.name, msg.avatar, now, (id) => {
        sockets.get(code)!.set(id, ws)
        sessions.set(ws, { code, seatId: id })
      })
      if (!seatId) {
        return send(ws, {
          t: 'error',
          message: room.started ? 'La partie a déjà commencé' : 'La table est complète'
        })
      }
      return
    }

    const session = sessions.get(ws)
    if (!session) return send(ws, { t: 'error', message: 'Rejoins d’abord une salle' })
    rooms.get(session.code)?.handle(session.seatId, msg, now)
  })

  ws.on('close', () => {
    const session = sessions.get(ws)
    if (!session) return
    rooms.get(session.code)?.leave(session.seatId, Date.now())
    sockets.get(session.code)?.delete(session.seatId)
  })
})

setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    room.tick(now)
    // Salle sans âme qui vive : on la libère plutôt que de la garder en mémoire.
    if (room.isEmpty && (sockets.get(code)?.size ?? 0) === 0) {
      rooms.delete(code)
      sockets.delete(code)
    }
  }
}, TICK_MS)

console.info(`[serveur] à l'écoute sur ws://localhost:${PORT}`)
