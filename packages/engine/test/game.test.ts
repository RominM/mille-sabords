import { describe, expect, it } from 'vitest'
import { DECISION_TIMEOUT_MS, Game, HISTORY_LENGTH } from '../src/game'
import type { DieFace, RollFn } from '../src/types'

/** Roller de test : file de lancers pré-programmés. */
function roller(...queues: DieFace[][]): RollFn {
  return (count: number) => {
    const next = queues.shift()
    if (!next || next.length !== count)
      throw new Error(`Roller de test : attendu ${count} faces, reçu ${next?.length ?? 0}`)
    return next
  }
}

const S = 'sabre' as const
const M = 'monkey' as const
const P = 'parrot' as const
const C = 'coin' as const

describe('nombre de joueurs', () => {
  const table = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }))

  it('accepte jusqu’à 8 joueurs', () => {
    expect(() => new Game(table(8))).not.toThrow()
  })

  it('refuse en dessous de 2 et au-dessus de 8', () => {
    expect(() => new Game(table(1))).toThrow()
    expect(() => new Game(table(9))).toThrow()
  })

  it('la rotation fait le tour de la table complète', () => {
    const game = new Game(table(8), { now: () => 0 })
    const vus: string[] = []
    for (let i = 0; i < 8; i++) {
      game.state.deck = [{ type: 'guardian' }]
      game.startTurn()
      vus.push(game.currentPlayer.id)
      game.timeout()
    }
    expect(vus).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'])
  })
})

describe('historique des tours', () => {
  const duo = () => [
    { id: 'p0', name: 'P0' },
    { id: 'p1', name: 'P1' }
  ]

  it('consigne un arrêt volontaire avec ses points', () => {
    const game = new Game(duo(), { now: () => 0 })
    game.state.deck = [{ type: 'guardian' }]
    game.startTurn()
    game.act({ type: 'roll' }, roller([S, S, S, M, M, P, C, C]))
    game.act({ type: 'stop' })

    expect(game.state.history).toHaveLength(1)
    expect(game.state.history[0]).toMatchObject({ playerId: 'p0', reason: 'stopped' })
    // La trace dit la même chose que le score : c'est la même source.
    expect(game.state.history[0]!.score).toBe(game.state.players[0]!.score)
  })

  it('distingue un tour expiré d’un tour perdu', () => {
    const game = new Game(duo(), { now: () => 0 })
    game.state.deck = [{ type: 'guardian' }]
    game.startTurn()
    game.timeout()

    // Sans cette distinction, un zéro ne se lit pas : trois têtes, une île et un
    // minuteur expiré donnent tous zéro pour des raisons très différentes.
    expect(game.state.history[0]).toMatchObject({ reason: 'timeout', score: 0 })
  })

  it('ne garde que les derniers tours', () => {
    const game = new Game(duo(), { now: () => 0 })
    for (let i = 0; i < HISTORY_LENGTH + 5; i++) {
      game.state.deck = [{ type: 'guardian' }]
      game.startTurn()
      game.timeout()
    }
    // L'état part en entier à chaque diffusion : il ne doit pas enfler sans fin.
    expect(game.state.history).toHaveLength(HISTORY_LENGTH)
  })

  it('un tour laisse exactement une trace', () => {
    const game = new Game(duo(), { now: () => 0 })
    game.state.deck = [{ type: 'guardian' }]
    game.startTurn()
    game.act({ type: 'roll' }, roller([S, S, S, M, M, P, C, C]))
    game.act({ type: 'stop' })
    expect(game.state.history).toHaveLength(1)
  })
})

describe('fin de partie — dernier tour', () => {
  it('franchir 6000 déclenche un dernier tour pour chaque autre joueur', () => {
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ],
      { now: () => 0 },
    )
    game.state.players[0]!.score = 6000

    // Tour de A : timeout (0 pt) mais A est à 6000 → déclenche le dernier tour.
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    expect(game.currentPlayer.id).toBe('a')
    game.timeout()

    expect(game.state.phase).toBe('playing') // pas de fin immédiate
    expect(game.state.finalTurnsLeft).toBe(2) // B et C ont un dernier tour
    expect(game.currentPlayer.id).toBe('b')

    // B joue son dernier tour.
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.timeout()
    expect(game.state.phase).toBe('playing')
    expect(game.state.finalTurnsLeft).toBe(1)
    expect(game.currentPlayer.id).toBe('c')

    // C joue le dernier tour → la partie se termine.
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.timeout()
    expect(game.state.phase).toBe('finished')
    expect(game.state.winnerId).toBe('a') // A garde le meilleur score
  })

  it('carte Pirate sur l’Île : le malus des adversaires est DOUBLÉ', () => {
    const K = 'skull' as const
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => 0 },
    )
    game.state.deck = [{ type: 'pirate' }]
    game.startTurn()
    game.act({ type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    expect(game.state.turn!.phase).toBe('island-roll')
    game.act({ type: 'roll' }, roller([S, M, P, S])) // aucune nouvelle tête → fin

    // 4 têtes × 100 = 400, doublés par la carte Pirate.
    expect(game.state.turn!.outcome!.opponentPenalty).toBe(800)
    expect(game.state.players[1]!.score).toBe(-800)
    expect(game.state.players[0]!.score).toBe(0) // l'actif ne perd rien
  })

  it('le délai porte sur la DÉCISION, et se réarme à chaque lancer', () => {
    // On lit la constante plutôt que de la recopier : sa valeur est un réglage
    // de confort, le comportement à figer est le RÉARMEMENT.
    const D = DECISION_TIMEOUT_MS
    let maintenant = 0
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => maintenant },
    )
    game.state.deck = [{ type: 'guardian' }]
    game.startTurn()
    expect(game.state.decisionDeadline).toBe(D)

    // Juste avant l'échéance, on tient encore.
    maintenant = D - 1
    expect(game.isTimedOut()).toBe(false)

    // Un lancer rouvre un délai COMPLET : relancer autant qu'on veut est permis,
    // seule la délibération est bornée.
    game.act({ type: 'roll' }, roller([C, C, C, M, P, S, S, M]))
    expect(game.state.decisionDeadline).toBe(D - 1 + D)

    // L'ancienne échéance est dépassée, mais le compte est reparti de zéro.
    maintenant = D + 1
    expect(game.isTimedOut()).toBe(false)

    maintenant = 2 * D + 1
    expect(game.isTimedOut()).toBe(true)
  })

  it('minuteur écoulé après un lancer : équivaut à s’arrêter, la partie avance', () => {
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => 0 },
    )
    game.state.deck = [{ type: 'guardian' }]
    game.startTurn()
    game.act({ type: 'roll' }, roller([C, C, C, M, P, S, S, M])) // 3 pièces = 400
    expect(game.state.turn!.phase).toBe('decision')

    game.timeout()
    // Le joueur absent encaisse ce qu'il avait, au lieu d'être puni de zéro.
    expect(game.state.players[0]!.score).toBe(400)
    expect(game.state.turn!.outcome!.reason).toBe('stopped')
    // Et surtout : la main passe, la partie ne se bloque pas.
    expect(game.currentPlayer.id).toBe('b')
  })

  it('minuteur écoulé AVANT tout lancer : zéro point, la main passe quand même', () => {
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => 0 },
    )
    game.state.deck = [{ type: 'guardian' }]
    game.startTurn()
    game.timeout()
    expect(game.state.players[0]!.score).toBe(0)
    expect(game.currentPlayer.id).toBe('b')
  })

  it('« Magie pirate » : 9 symboles identiques terminent la partie sur-le-champ', () => {
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => 0 },
    )
    // La carte Pièce d'or apporte le 9e symbole aux 8 dés.
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.act({ type: 'roll' }, roller([C, C, C, C, C, C, C, C]))
    game.act({ type: 'stop' })

    expect(game.state.phase).toBe('finished')
    expect(game.state.winnerId).toBe('a')
    // Victoire immédiate : aucune dernière manche n'est armée.
    expect(game.state.finalTurnsLeft).toBeNull()
  })

  it('seuil franchi puis reperdu : la partie continue en mort subite', () => {
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => 0 },
    )
    game.state.players[0]!.score = 6000

    // A déclenche la dernière manche, puis B l'envoie sous le seuil : sur l'île,
    // chaque tête retire 100 points à l'adversaire.
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.timeout()
    expect(game.state.finalTurnsLeft).toBe(1)

    const K = 'skull' as const
    game.state.deck = [{ type: 'animals' }]
    game.startTurn()
    // 4 têtes au premier lancer → l'île ; le lancer suivant n'en sort aucune,
    // le tour s'arrête et A perd 4 × 100 points.
    game.act({ type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    game.act({ type: 'roll' }, roller([S, M, P, S]))

    // A est retombé sous 6000 : personne n'atteint le seuil → mort subite.
    expect(game.state.players[0]!.score).toBeLessThan(6000)
    expect(game.state.phase).toBe('playing')
    expect(game.state.suddenDeath).toBe(true)
    expect(game.state.finalTurnsLeft).toBeNull()

    // Le premier à repasser 6000 gagne immédiatement, sans nouvelle manche.
    game.state.players[0]!.score = 6000
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.timeout()
    expect(game.state.phase).toBe('finished')
    expect(game.state.winnerId).toBe('a')
  })

  it('le vainqueur est le meilleur score, pas forcément le déclencheur', () => {
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => 0 },
    )
    game.state.players[0]!.score = 6000
    game.state.players[1]!.score = 5900

    // A déclenche le dernier tour (timeout à 6000).
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.timeout()
    expect(game.state.phase).toBe('playing')
    expect(game.currentPlayer.id).toBe('b')

    // B marque assez pour dépasser A lors de son dernier tour.
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.act({ type: 'roll' }, roller([C, C, C, M, P, S, S, M])) // 3 pièces + carte pièce
    game.act({ type: 'stop' })

    expect(game.state.phase).toBe('finished')
    expect(game.state.players[1]!.score).toBeGreaterThan(6000)
    expect(game.state.winnerId).toBe('b') // B a doublé A sur le fil
  })

  it('sous 6000, aucun dernier tour armé', () => {
    const game = new Game(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      { now: () => 0 },
    )
    game.state.players[0]!.score = 3000
    game.state.deck = [{ type: 'coin' }]
    game.startTurn()
    game.timeout()
    expect(game.state.phase).toBe('playing')
    expect(game.state.finalTurnsLeft).toBeNull()
    expect(game.currentPlayer.id).toBe('b')
  })
})
