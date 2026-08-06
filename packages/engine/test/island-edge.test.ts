import { describe, expect, it } from 'vitest'
import { applyAction, createTurn } from '../src/turn'
import type { DieFace, RollFn } from '../src/types'

function roller(...queues: DieFace[][]): RollFn {
  return (count: number) => {
    const next = queues.shift()
    if (!next || next.length !== count)
      throw new Error(`Roller de test : attendu ${count} faces, reçu ${next?.length ?? 0}`)
    return next
  }
}
const S = 'sabre' as const
const K = 'skull' as const
const M = 'monkey' as const
const P = 'parrot' as const

describe('Île de la Tête-de-Mort — plus jamais de blocage', () => {
  it('continue avec un seul dé restant : le minimum de deux ne vaut pas sur l’île', () => {
    // 4 têtes au 1er lancer → île
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    expect(t.phase).toBe('island-roll')

    // Relance des 4 restants : 3 nouvelles têtes → il ne reste qu'UN dé. Sur
    // l'île on relance « les dés restants », sans minimum : le tour continue.
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, P]))
    expect(t.phase).toBe('island-roll')
    expect(t.dice.filter(d => d.face === K)).toHaveLength(7)

    // Ce dernier dé ne sort pas de tête → le tour s'arrête là.
    t = applyAction(t, { type: 'roll' }, roller([S]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.reason).toBe('skull-island')
    expect(t.outcome!.skulls).toBe(7)
    expect(t.outcome!.opponentPenalty).toBe(700)
  })

  it('le dernier dé sort en tête : 8 têtes, plus rien à lancer, le tour se clôt', () => {
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, P]))
    t = applyAction(t, { type: 'roll' }, roller([K]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.skulls).toBe(8)
    expect(t.outcome!.opponentPenalty).toBe(800)
  })

  it('tous les dés en têtes : le tour se termine aussi', () => {
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.skulls).toBe(8)
  })

  it('avec 2 dés restants, la relance forcée reste possible', () => {
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    t = applyAction(t, { type: 'roll' }, roller([K, K, M, P]))
    expect(t.phase).toBe('island-roll')
    expect(t.dice.filter(d => d.face !== 'skull').length).toBe(2)
    t = applyAction(t, { type: 'roll' }, roller([S, M]))
    expect(t.phase).toBe('ended') // aucune nouvelle tête → fin
  })
})
