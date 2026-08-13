/**
 * Coquille réseau : elle ne connaît AUCUNE règle.
 *
 * Son rôle se limite à router les messages vers la bonne salle, à faire battre
 * le temps, et à ramasser les salles vides. Toute la logique vit dans `Room`,
 * qui est pure et testée sans socket.
 */
import { WebSocketServer, type WebSocket } from 'ws'
import { Room } from './room.js'
import { loadRooms, saveRooms } from './store.js'
import { makeRoomCode, type ClientMessage, type ServerMessage } from '@rf/protocol'

const PORT = Number(process.env.PORT ?? 8787)
/** Cadence du battement : assez fine pour un minuteur à la seconde. */
const TICK_MS = 500
/** Cadence de sauvegarde : on accepte de perdre au plus ces quelques secondes. */
const SAVE_MS = 5_000
/**
 * Une salle désertée n'est pas une salle morte : un rechargement de page coupe
 * le socket pendant une seconde, et un redémarrage du serveur les coupe TOUS.
 * On laisse donc le temps de revenir avant de rendre le code.
 */
const EMPTY_GRACE_MS = 10 * 60 * 1_000

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
  let code = makeRoomCode()
  while (rooms.has(code)) code = makeRoomCode()
  return code
}

/** Depuis quand une salle n'a plus personne — `undefined` = elle est habitée. */
const emptySince = new Map<string, number>()

// ── Reprise après redémarrage ────────────────────────────────────────────────
// Les parties en cours sont relues AVANT d'ouvrir le port : un joueur qui se
// reconnecte à la seconde où le serveur revient doit retrouver sa salle, pas
// s'entendre dire que son code n'existe pas.
{
  const now = Date.now()
  for (const snap of loadRooms(now)) {
    if (rooms.has(snap.code)) continue
    sockets.set(snap.code, new Map())
    rooms.set(snap.code, Room.restore(snap, emitFor(snap.code), now))
    emptySince.set(snap.code, now)
  }
  if (rooms.size) console.info(`[serveur] ${rooms.size} partie(s) reprise(s) du disque`)
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
        // On ne crée que pour celui qui n'a pas donné de code, ou qui en PROPOSE
        // un (l'hôte tire le sien avant d'embarquer, pour pouvoir le partager) :
        // un code inconnu reste une faute de frappe, pas une invitation à ouvrir
        // une salle.
        if (msg.code && !msg.create) {
          return send(ws, { t: 'error', message: 'Aucune salle avec ce code' })
        }
        room = new Room(code, emitFor(code))
        rooms.set(code, room)
        sockets.set(code, new Map())
      } else if (msg.create) {
        // Le code proposé est déjà pris. On ne le rejoint pas en douce : l'hôte
        // croirait ouvrir sa table et atterrirait chez des inconnus.
        return send(ws, { t: 'error', message: 'Ce code est déjà pris — tires-en un autre' })
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

    // Salle sans âme qui vive. On ne la libère plus sur-le-champ : ce délai est
    // ce qui rend la reprise possible, puisqu'après un redémarrage TOUTES les
    // salles sont désertes le temps que les joueurs reviennent.
    if (room.isEmpty && (sockets.get(code)?.size ?? 0) === 0) {
      const since = emptySince.get(code) ?? now
      emptySince.set(code, since)
      if (now - since >= EMPTY_GRACE_MS) {
        rooms.delete(code)
        sockets.delete(code)
        emptySince.delete(code)
      }
    } else {
      emptySince.delete(code)
    }
  }
}, TICK_MS)

/** Sauvegarde des parties en cours. Les salles d'attente ne rendent rien. */
function persist(): void {
  const snapshots = []
  for (const room of rooms.values()) {
    const snap = room.snapshot()
    if (snap) snapshots.push(snap)
  }
  saveRooms(snapshots)
}

setInterval(persist, SAVE_MS)

// Un arrêt propre — redémarrage, `docker restart`, Ctrl+C — sauve la dernière
// seconde de jeu, que le battement périodique n'aurait pas eu le temps d'écrire.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    persist()
    process.exit(0)
  })
}

console.info(`[serveur] à l'écoute sur ws://localhost:${PORT}`)
