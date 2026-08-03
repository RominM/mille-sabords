import type { DieFace, PirateCard, RollFn } from './types'
import { FACES } from './types'

/**
 * Composition du deck de 35 cartes Pirate retenue pour le jeu.
 * ⚠️ La règle écrite ne donne que le total (35) : la répartition ci-dessous est
 * celle que nous avons arrêtée, à confirmer si le barème évolue.
 */
export function buildDeck(): PirateCard[] {
  const deck: PirateCard[] = []
  const push = (card: PirateCard, n: number) => {
    for (let i = 0; i < n; i++) deck.push(structuredClone(card))
  }
  push({ type: 'treasure-island' }, 4)
  push({ type: 'pirate' }, 4)
  push({ type: 'skulls', count: 1 }, 3)
  push({ type: 'skulls', count: 2 }, 2)
  push({ type: 'guardian' }, 4)
  push({ type: 'ship', sabres: 2, value: 300 }, 2)
  push({ type: 'ship', sabres: 3, value: 500 }, 2)
  push({ type: 'ship', sabres: 4, value: 1000 }, 2)
  push({ type: 'coin' }, 4)
  push({ type: 'diamond' }, 4)
  push({ type: 'animals' }, 4)
  return deck
}

/** Fisher-Yates, RNG injectable (seedable côté serveur / tests) */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/** Roller de production. En test, on injecte des files de faces déterministes. */
export function makeRandomRoller(rng: () => number = Math.random): RollFn {
  return (count: number) =>
    Array.from({ length: count }, () => FACES[Math.floor(rng() * FACES.length)] as DieFace)
}

/** PRNG seedable (mulberry32) : indispensable pour rejouer/débugger une partie serveur */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
