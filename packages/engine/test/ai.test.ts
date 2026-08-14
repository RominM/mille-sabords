import { describe, expect, it } from 'vitest'
import {
  chooseBankSet,
  chooseRerollSet,
  decideAction,
  expectedStopAfterReroll,
  playBotTurn,
} from '../src/ai'
import { createTurn } from '../src/turn'
import { scoreTurn } from '../src/scoring'
import { Game } from '../src/game'
import { applyAction } from '../src/turn'
import type { DieFace, RollFn, TurnState } from '../src/types'

/** Roller de test : file de lancers pré-programmés (repris de turn.test.ts). */
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
const C = 'coin' as const
const D = 'diamond' as const

/** Ouvre un tour et effectue le premier lancer avec les faces données. */
function decisionTurn(card: Parameters<typeof createTurn>[0], faces: DieFace[]): TurnState {
  return applyAction(createTurn(card), { type: 'roll' }, roller(faces))
}

describe('lancers forcés', () => {
  it('premier lancer → roll', () => {
    expect(decideAction(createTurn({ type: 'guardian' }))).toEqual({ type: 'roll' })
  })

  it('Île de la Tête-de-Mort → roll', () => {
    const t = decisionTurn({ type: 'animals' }, [K, K, K, K, S, S, M, P])
    expect(t.phase).toBe('island-roll')
    expect(decideAction(t)).toEqual({ type: 'roll' })
  })
})

describe('choix de la relance', () => {
  it('garde les dés marquants, relance le reste', () => {
    // 1 pièce + 1 diamant marquent ; 6 autres (sabre/singe/perroquet) non
    const t = decisionTurn({ type: 'guardian' }, [C, D, S, S, M, M, P, P])
    expect(chooseRerollSet(t)).toEqual([2, 3, 4, 5, 6, 7])
  })

  it('rien à relancer (tous marquent) → null', () => {
    // 3 sabres + 3 singes + pièce + diamant : tout marque (coffre plein)
    const t = decisionTurn({ type: 'guardian' }, [S, S, S, M, M, M, C, D])
    expect(chooseRerollSet(t)).toBeNull()
  })

  it('Bateau Pirate : garde les sabres (quota), relance le reste', () => {
    // 3 sabres isolés (à garder pour le quota), le reste sans intérêt
    const t = decisionTurn({ type: 'ship', sabres: 4, value: 1000 }, [S, S, M, P, M, P, S, M])
    const ids = chooseRerollSet(t)
    expect(ids).not.toBeNull()
    // ids 0,1,6 = sabres → jamais relancés
    expect(ids).not.toContain(0)
    expect(ids).not.toContain(1)
    expect(ids).not.toContain(6)
  })

  it('Bateau Pirate non atteint : relance même les trésors (sans valeur si raté)', () => {
    // 2 sabres seulement pour un quota de 4 : pièces/diamants ne valent rien
    // tant que le bateau échoue → on les relance pour chasser des sabres.
    const t = decisionTurn({ type: 'ship', sabres: 4, value: 1000 }, [S, C, D, S, M, P, C, D])
    const ids = chooseRerollSet(t)!
    expect(ids).not.toContain(0) // sabre gardé
    expect(ids).not.toContain(3) // sabre gardé
    expect(ids).toContain(1) // pièce relancée
    expect(ids).toContain(2) // diamant relancé
  })

  it('Bateau Pirate atteint : garde les trésos en plus des sabres', () => {
    // 4 sabres → quota atteint, le bateau réussit : pièces gardées, on relance
    // seulement le singe et le perroquet.
    const t = decisionTurn({ type: 'ship', sabres: 4, value: 1000 }, [S, S, S, S, C, C, M, P])
    const ids = chooseRerollSet(t)!
    expect(ids).toEqual([6, 7])
  })
})

describe('décision arrêter / relancer', () => {
  it('score solide + 2 têtes → s’arrête (l’espérance ne vaut pas le risque)', () => {
    // 3 pièces (100 combo + 300 trésor = 400) et 2 têtes verrouillées
    const t = decisionTurn({ type: 'guardian' }, [C, C, C, K, K, S, M, P])
    const stopNow = scoreTurn(t.dice, t.card).total
    expect(stopNow).toBe(400)
    const ids = chooseRerollSet(t)!
    expect(expectedStopAfterReroll(t, ids)).toBeLessThan(stopNow)
    expect(decideAction(t, { difficulty: 'hard' }).type).toBe('stop')
  })

  it('beaucoup de dés frais, aucune tête → relance', () => {
    const t = decisionTurn({ type: 'guardian' }, [C, D, S, S, M, M, P, P])
    const action = decideAction(t, { difficulty: 'hard' })
    expect(action.type).toBe('reroll')
  })

  it('relance sans risque (2 dés, 0 tête : bust impossible) → relance même en hard', () => {
    // 6 pièces marquent (combo 6 = 1000 + 600 trésor = 1600) ; 2 dés à relancer
    const t = decisionTurn({ type: 'guardian' }, [C, C, C, C, C, C, S, M])
    const stopNow = scoreTurn(t.dice, t.card).total
    const ids = chooseRerollSet(t)!
    expect(ids).toEqual([6, 7])
    // 2 dés ne peuvent pas produire 3 têtes : l’espérance ne peut que monter
    expect(expectedStopAfterReroll(t, ids)).toBeGreaterThan(stopNow)
    expect(decideAction(t, { difficulty: 'hard' }).type).toBe('reroll')
  })

  it('« easy » n’est jamais plus téméraire que « hard »', () => {
    // Sur n’importe quel état de décision, une marge plus élevée ne peut que
    // rendre l’IA plus prudente : si hard s’arrête, easy s’arrête aussi ; si
    // easy relance, hard relance aussi.
    const cases: DieFace[][] = [
      [C, C, C, S, S, M, P, D],
      [C, D, S, S, M, M, P, P],
      [C, C, C, K, K, S, M, P],
      [S, S, M, M, P, C, D, K],
    ]
    for (const faces of cases) {
      const t = decisionTurn({ type: 'guardian' }, faces)
      if (t.phase !== 'decision') continue
      const hard = decideAction(t, { difficulty: 'hard' }).type
      const easy = decideAction(t, { difficulty: 'easy' }).type
      if (hard === 'stop') expect(easy).toBe('stop')
      if (easy === 'reroll') expect(hard).toBe('reroll')
    }
  })
})

describe('Île au Trésor', () => {
  it('réserve d’abord les dés marquants', () => {
    const t = decisionTurn({ type: 'treasure-island' }, [C, C, C, D, S, S, M, P])
    expect(chooseBankSet(t)).toEqual([0, 1, 2, 3])
    expect(decideAction(t)).toEqual({ type: 'bank', diceIds: [0, 1, 2, 3] })
  })
})

describe('partie complète pilotée par l’IA', () => {
  it('deux IA jouent jusqu’à la victoire sans action illégale', () => {
    const game = new Game(
      [
        { id: 'a', name: 'Bot A', bot: true },
        { id: 'b', name: 'Bot B', bot: true },
      ],
      { rng: (() => {
        // PRNG simple et déterministe pour un test reproductible
        let s = 123456789
        return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
      })() },
    )

    let turns = 0
    while (game.state.phase === 'playing' && turns < 5000) {
      game.startTurn()
      playBotTurn(game, { difficulty: 'hard' })
      turns++
    }

    expect(game.state.phase).toBe('finished')
    expect(game.state.winnerIds).not.toHaveLength(0)
    const winner = game.state.players.find(p => p.id === game.state.winnerIds[0])!
    expect(winner.score).toBeGreaterThanOrEqual(6000)
  })
})
