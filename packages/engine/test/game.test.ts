import { describe, expect, it } from 'vitest'
import { Game } from '../src/game'
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
