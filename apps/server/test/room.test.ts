import { describe, expect, it } from 'vitest'
import { Room, RECAP_MS, LOBBY_GRACE_MS } from '../src/room.js'
import type { LobbyView, ServerMessage } from '../src/protocol.js'

/** Salle instrumentée : on capture ce qu'elle émet, à qui. */
function makeRoom() {
  const sent: { to: string; msg: ServerMessage }[] = []
  const room = new Room('ABCD', (to, msg) => sent.push({ to, msg }))

  const lastLobby = (): LobbyView | null => {
    for (let i = sent.length - 1; i >= 0; i--) {
      const m = sent[i]!.msg
      if (m.t === 'lobby') return m.lobby
    }
    return null
  }
  const errorsFor = (seatId: string): string[] =>
    sent.filter((s) => s.to === seatId && s.msg.t === 'error').map((s) => (s.msg as { message: string }).message)
  const lastStateFor = (seatId: string) => {
    for (let i = sent.length - 1; i >= 0; i--) {
      const { to, msg } = sent[i]!
      if (to === seatId && msg.t === 'state') return msg.game
    }
    return null
  }
  return { room, sent, lastLobby, errorsFor, lastStateFor }
}

describe('salle d’attente', () => {
  it('le premier arrivé devient hôte, les suivants non', () => {
    const { room, lastLobby } = makeRoom()
    const a = room.join('tok-a', 'Romin', 'av', 0)!
    const b = room.join('tok-b', 'Ami', 'av', 0)!
    expect(lastLobby()!.hostId).toBe(a)
    expect(lastLobby()!.seats.map((s) => s.id)).toEqual([a, b])
  })

  it('seul l’hôte ajoute une IA ou règle la difficulté', () => {
    const { room, errorsFor, lastLobby } = makeRoom()
    room.join('tok-a', 'Romin', 'av', 0)
    const b = room.join('tok-b', 'Ami', 'av', 0)!

    room.handle(b, { t: 'add-bot' }, 0)
    room.handle(b, { t: 'difficulty', value: 'hard' }, 0)
    expect(errorsFor(b)).toHaveLength(2)
    expect(lastLobby()!.seats.filter((s) => s.bot)).toHaveLength(0)
    expect(lastLobby()!.difficulty).toBe('medium')
  })

  it('refuse le départ tant que tout l’équipage n’est pas paré', () => {
    const { room, errorsFor, lastLobby } = makeRoom()
    const a = room.join('tok-a', 'Romin', 'av', 0)!
    room.join('tok-b', 'Ami', 'av', 0)

    room.handle(a, { t: 'start' }, 0)
    expect(errorsFor(a)).toContain('Tout l’équipage doit être paré')
    expect(lastLobby()!.started).toBe(false)
  })

  it('l’hôte qui s’en va en salle d’attente passe la main', () => {
    const { room, lastLobby } = makeRoom()
    const a = room.join('tok-a', 'Romin', 'av', 0)!
    const b = room.join('tok-b', 'Ami', 'av', 0)!
    room.leave(a, 0)
    expect(lastLobby()!.hostId).toBe(b)
  })

  it('le siège quitté se libère après le délai de grâce', () => {
    const { room, lastLobby } = makeRoom()
    room.join('tok-a', 'Romin', 'av', 0)
    const b = room.join('tok-b', 'Ami', 'av', 0)!

    room.leave(b, 1_000)
    room.tick(1_000 + LOBBY_GRACE_MS - 1)
    expect(lastLobby()!.seats).toHaveLength(2)

    room.tick(1_000 + LOBBY_GRACE_MS + 1)
    expect(lastLobby()!.seats).toHaveLength(1)
  })
})

describe('partie', () => {
  /** Deux humains parés, partie lancée. */
  function started() {
    const h = makeRoom()
    const a = h.room.join('tok-a', 'Romin', 'av', 0)!
    const b = h.room.join('tok-b', 'Ami', 'av', 0)!
    h.room.handle(a, { t: 'ready', ready: true }, 0)
    h.room.handle(b, { t: 'ready', ready: true }, 0)
    h.room.handle(a, { t: 'start' }, 0)
    return { ...h, a, b }
  }

  it('démarre et diffuse l’état à chaque joueur', () => {
    const { a, b, lastStateFor } = started()
    expect(lastStateFor(a)).not.toBeNull()
    expect(lastStateFor(b)).not.toBeNull()
    expect(lastStateFor(a)!.players.map((p) => p.id)).toEqual([a, b])
  })

  it('refuse l’action d’un joueur dont ce n’est pas le tour', () => {
    const { room, a, b, lastStateFor, errorsFor } = started()
    const actif = lastStateFor(a)!.currentPlayerIndex === 0 ? a : b
    const autre = actif === a ? b : a

    room.handle(autre, { t: 'act', action: { type: 'roll' } }, 0)
    expect(errorsFor(autre)).toContain('Ce n’est pas ton tour')
    // L'état n'a pas bougé : les dés n'ont pas été lancés.
    expect(lastStateFor(a)!.turn!.dice.every((d) => d.face === null)).toBe(true)
  })

  it('accepte l’action du joueur actif', () => {
    const { room, a, b, lastStateFor } = started()
    const actif = lastStateFor(a)!.currentPlayerIndex === 0 ? a : b
    room.handle(actif, { t: 'act', action: { type: 'roll' } }, 0)
    expect(lastStateFor(a)!.turn!.dice.every((d) => d.face !== null)).toBe(true)
  })

  it('enchaîne le tour suivant tout seul, sans attendre un clic', () => {
    const { room, a, b, lastStateFor } = started()
    const depart = lastStateFor(a)!.currentPlayerIndex
    const actif = depart === 0 ? a : b

    // Le tour se termine par un arrêt volontaire.
    room.handle(actif, { t: 'act', action: { type: 'roll' } }, 0)
    room.handle(actif, { t: 'act', action: { type: 'stop' } }, 0)
    expect(lastStateFor(a)!.turn!.phase).toBe('ended')

    // Personne ne clique : le serveur enchaîne de lui-même après le récap.
    room.tick(RECAP_MS - 1)
    expect(lastStateFor(a)!.turn!.phase).toBe('ended')
    room.tick(RECAP_MS + 1)
    expect(lastStateFor(a)!.currentPlayerIndex).not.toBe(depart)
  })

  it('un joueur qui revient retrouve son siège et ses points', () => {
    const { room, a, b, lastStateFor } = started()
    const actif = lastStateFor(a)!.currentPlayerIndex === 0 ? a : b
    room.handle(actif, { t: 'act', action: { type: 'roll' } }, 0)

    room.leave(b, 100)
    const retour = room.join('tok-b', 'Ami', 'av', 200)
    expect(retour).toBe(b) // même siège, donc même score
    expect(lastStateFor(b)).not.toBeNull()
  })

  it('un inconnu ne peut pas s’inviter en cours de partie', () => {
    const { room } = started()
    expect(room.join('tok-inconnu', 'Intrus', 'av', 0)).toBeNull()
  })

  it('le départ de l’hôte ne bloque pas la partie', () => {
    const { room, a, b, lastStateFor } = started()
    room.leave(a, 0)
    // La table continue de tourner : le minuteur fait avancer les tours.
    const avant = lastStateFor(b)!.currentPlayerIndex
    room.tick(60_000)
    room.tick(60_000 + RECAP_MS + 1)
    expect(lastStateFor(b)!.currentPlayerIndex).not.toBe(avant)
  })
})
