import { describe, expect, it } from 'vitest'
import { DECISION_TIMEOUT_MS } from '@rf/engine'
import { Room, RECAP_MS, LOBBY_GRACE_MS, type RoomSnapshot } from '../src/room.js'
import type { LobbyView, SeatView, ServerMessage } from '@rf/protocol'

/** Salle instrumentée : on capture ce qu'elle émet, à qui. */
function makeRoom() {
  const sent: { to: string; msg: ServerMessage }[] = []
  const emit = (to: 'all' | string, msg: ServerMessage): void => void sent.push({ to, msg })
  const room = new Room('ABCD', emit)

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
  const lastRoster = (from = 0): SeatView[] | null => {
    for (let i = sent.length - 1; i >= from; i--) {
      const m = sent[i]!.msg
      if (m.t === 'roster') return m.seats
    }
    return null
  }
  const rosterCount = (): number => sent.filter((s) => s.msg.t === 'roster').length

  return { room, sent, emit, lastLobby, errorsFor, lastStateFor, lastRoster, rosterCount }
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

/** Deux humains parés, partie lancée. */
function started() {
  const h = makeRoom()
  const a = h.room.join('tok-a', 'Romin', 'av-a', 0)!
  const b = h.room.join('tok-b', 'Ami', 'av-b', 0)!
  h.room.handle(a, { t: 'ready', ready: true }, 0)
  h.room.handle(b, { t: 'ready', ready: true }, 0)
  h.room.handle(a, { t: 'start' }, 0)
  return { ...h, a, b }
}

/**
 * Même chose, mais le joueur actif a lancé et sa décision est ENCORE OUVERTE.
 *
 * Le tirage est aléatoire : trois têtes de mort clôturent le tour sur-le-champ,
 * et l'Île de la Tête-de-Mort interdit l'arrêt. Les tests qui portent sur la
 * suite du tour n'ont alors plus de sujet — on remet donc la table jusqu'à
 * obtenir un tour ordinaire, plutôt que d'échouer une fois sur dix.
 */
function enDecision() {
  for (let essai = 0; essai < 50; essai++) {
    const h = started()
    const actif = h.lastStateFor(h.a)!.currentPlayerIndex === 0 ? h.a : h.b
    h.room.handle(actif, { t: 'act', action: { type: 'roll' } }, 0)
    if (h.lastStateFor(h.a)!.turn!.phase === 'decision') return { ...h, actif }
  }
  throw new Error('aucun tour resté ouvert en 50 essais')
}

describe('partie', () => {
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
    const { room, a, actif, lastStateFor } = enDecision()
    const depart = lastStateFor(a)!.currentPlayerIndex

    // Le tour se termine par un arrêt volontaire.
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
    const retour = room.join('tok-b', 'Ami', 'av-b', 200)
    expect(retour).toBe(b) // même siège, donc même score
    expect(lastStateFor(b)).not.toBeNull()
  })

  it('diffuse les portraits, que l’état de jeu ne transporte pas', () => {
    const { a, b, lastRoster, lastStateFor } = started()
    // Le moteur ignore tout des avatars : c'est bien ce qu'on vérifie ici.
    expect(lastStateFor(a)!.players[0]).not.toHaveProperty('avatar')
    expect(lastRoster()!.map((s) => [s.id, s.avatar])).toEqual([
      [a, 'av-a'],
      [b, 'av-b']
    ])
  })

  it('rediffuse la composition à celui qui revient en pleine partie', () => {
    const { room, b, sent, lastRoster } = started()
    room.leave(b, 100)
    const depuis = sent.length
    room.join('tok-b', 'Ami', 'av-b', 200)

    // Sans cette rediffusion, le joueur rechargé se retrouverait avec l'état de
    // la partie mais aucun visage à afficher.
    const revu = lastRoster(depuis)
    expect(revu).not.toBeNull()
    expect(revu!.find((s) => s.id === b)!.avatar).toBe('av-b')
  })

  it('ne rediffuse pas la composition à chaque coup', () => {
    const { room, actif, rosterCount } = enDecision()
    const avant = rosterCount()
    room.handle(actif, { t: 'act', action: { type: 'stop' } }, 0)
    expect(rosterCount()).toBe(avant)
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

describe('reprise après redémarrage', () => {
  /** Le redémarrage lui-même : on ne garde QUE ce qui passe par le disque. */
  function redemarre(snap: RoomSnapshot, now: number) {
    const h = makeRoom()
    // Le passage par JSON n'est pas un détail : c'est exactement ce que le
    // fichier fait subir à la photographie.
    const revenue = JSON.parse(JSON.stringify(snap)) as RoomSnapshot
    return { ...h, room: Room.restore(revenue, h.emit, now) }
  }

  it('une salle d’attente n’a rien à sauver', () => {
    const { room } = makeRoom()
    room.join('tok-a', 'Romin', 'av-a', 0)
    room.join('tok-b', 'Ami', 'av-b', 0)
    // Elle se recompose en dix secondes, et ses sièges auraient expiré pendant
    // le redémarrage de toute façon.
    expect(room.snapshot()).toBeNull()
  })

  it('la partie reprend au même point, dés et scores compris', () => {
    const { room, a, lastStateFor } = enDecision()
    const avant = lastStateFor(a)!
    const snap = room.snapshot()!

    const T = 5_000_000
    const repris = redemarre(snap, T)
    // Le joueur revient avec son jeton : il retrouve son siège.
    expect(repris.room.join('tok-a', 'Romin', 'av-a', T)).toBe(a)

    const apres = repris.lastStateFor(a)!
    expect(apres.players).toEqual(avant.players)
    expect(apres.currentPlayerIndex).toBe(avant.currentPlayerIndex)
    expect(apres.turn!.dice).toEqual(avant.turn!.dice)
    expect(apres.deck.length).toBe(avant.deck.length)
  })

  it('le joueur actif ne perd pas son tour à cause du redémarrage', () => {
    const { room, a } = enDecision()
    const snap = room.snapshot()!

    // L'échéance sauvegardée date d'avant le redémarrage : telle quelle, elle
    // serait dépassée dès la reprise et coûterait son tour au joueur actif.
    const T = 5_000_000
    const repris = redemarre(snap, T)
    repris.room.join('tok-a', 'Romin', 'av-a', T)
    expect(repris.lastStateFor(a)!.decisionDeadline).toBe(T + DECISION_TIMEOUT_MS)

    repris.room.tick(T + 1_000)
    expect(repris.lastStateFor(a)!.turn!.phase).not.toBe('ended')
  })

  it('les portraits survivent au redémarrage', () => {
    const { room, a, b } = enDecision()
    const T = 5_000_000
    const repris = redemarre(room.snapshot()!, T)
    repris.room.join('tok-b', 'Ami', 'av-b', T)

    expect(repris.lastRoster()!.map((s) => [s.id, s.avatar])).toEqual([
      [a, 'av-a'],
      [b, 'av-b']
    ])
  })

  it('personne n’est réputé connecté avant d’être revenu', () => {
    const { room } = enDecision()
    const T = 5_000_000
    const repris = redemarre(room.snapshot()!, T)
    // Les sockets n'ont pas survécu : prétendre le contraire enverrait l'état à
    // des destinataires inexistants et fausserait le ramassage des salles.
    expect(repris.room.isEmpty).toBe(true)
  })
})
