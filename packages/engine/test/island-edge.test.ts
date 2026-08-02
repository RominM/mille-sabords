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
const S = 'sabre' as const, K = 'skull' as const, M = 'monkey' as const, P = 'parrot' as const

describe("Île de la Tête-de-Mort — cas limite d'un seul dé restant", () => {
  it("un seul dé non-tête : le lancer forcé reste possible et clôt le tour", () => {
    // 4 têtes au 1er lancer → île
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    expect(t.phase).toBe('island-roll')
    // relance des 4 restants : 3 nouvelles têtes → il ne reste qu'UN dé
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, P]))
    expect(t.phase).toBe('island-roll')
    expect(t.dice.filter(d => d.face !== 'skull').length).toBe(1)
    // Le lancer d'UN seul dé doit être accepté (le minimum de 2 ne vaut que
    // pour les relances volontaires) et terminer le tour.
    t = applyAction(t, { type: 'roll' }, roller([M]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.reason).toBe('skull-island')
  })

  it('le dernier dé devient une tête : le tour se termine aussi', () => {
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, M, P, S]))
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, P]))
    t = applyAction(t, { type: 'roll' }, roller([K]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.skulls).toBe(8)
  })
})
