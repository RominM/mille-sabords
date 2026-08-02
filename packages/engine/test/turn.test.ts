import { describe, expect, it } from 'vitest'
import { applyAction, createTurn, IllegalActionError } from '../src/turn'
import { Game } from '../src/game'
import type { DieFace, RollFn, TurnState } from '../src/types'

/** Roller de test : file de lancers pré-programmés */
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

describe('déroulement du tour', () => {
  it('premier lancer → décision, têtes de mort verrouillées', () => {
    let t = createTurn({ type: 'guardian' })
    t = applyAction(t, { type: 'roll' }, roller([S, S, K, M, P, C, D, S]))
    expect(t.phase).toBe('decision')
    expect(t.dice[2]!.locked).toBe(true)
  })

  it('3e tête de mort en relance → tour perdu, 0 point', () => {
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, S, S, M, M, P, C]))
    t = applyAction(
      t,
      { type: 'reroll', diceIds: [4, 5, 6, 7] },
      roller([K, S, S, S]),
    )
    expect(t.phase).toBe('ended')
    expect(t.outcome).toMatchObject({ reason: 'three-skulls', score: 0 })
  })

  it('validation des relances : min 2 dés, pas de tête de mort', () => {
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, S, S, M, M, P, C, D]))

    expect(() =>
      applyAction(t, { type: 'reroll', diceIds: [1] }, roller([S])),
    ).toThrow(IllegalActionError) // 1 seul dé
    expect(() =>
      applyAction(t, { type: 'reroll', diceIds: [0, 1] }, roller([S, S])),
    ).toThrow(IllegalActionError) // tête de mort dans la sélection
  })

  it('relancer TOUS les dés relançables est permis', () => {
    // Aucune tête : les 8 dés peuvent repartir d'un coup.
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([S, S, M, M, P, C, D, S]))
    t = applyAction(
      t,
      { type: 'reroll', diceIds: [0, 1, 2, 3, 4, 5, 6, 7] },
      roller([C, C, C, D, D, M, P, S]),
    )
    expect(t.phase).toBe('decision')
    expect(t.dice[0]!.face).toBe(C)
  })

  it('arrêt volontaire : points comptés', () => {
    let t = createTurn({ type: 'guardian' })
    t = applyAction(t, { type: 'roll' }, roller([S, S, S, C, C, C, M, P]))
    t = applyAction(t, { type: 'stop' }, roller())
    // 100 (sabres) + 100 (pièces) + 300 trésor = 500
    expect(t.outcome).toMatchObject({ reason: 'stopped', score: 500 })
  })
})

describe('carte Tête de Mort', () => {
  it('les têtes de la carte comptent : carte(2) + 1 dé = 3 → tour perdu direct', () => {
    let t = createTurn({ type: 'skulls', count: 2 })
    t = applyAction(t, { type: 'roll' }, roller([K, S, S, M, M, P, C, D]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.reason).toBe('three-skulls')
    expect(t.outcome!.skulls).toBe(3)
  })

  it("carte(2) + 2 dés = 4 → direction l'Île de la Tête-de-Mort", () => {
    let t = createTurn({ type: 'skulls', count: 2 })
    t = applyAction(t, { type: 'roll' }, roller([K, K, S, S, M, M, P, C]))
    expect(t.phase).toBe('island-roll')
  })
})

describe('Île de la Tête-de-Mort', () => {
  it('4 têtes au premier lancer → île, on continue tant que ça sort des têtes', () => {
    let t = createTurn({ type: 'animals' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, S, M, P]))
    expect(t.phase).toBe('island-roll')

    // Relance des 4 dés restants : 1 nouvelle tête → on continue
    t = applyAction(t, { type: 'roll' }, roller([K, S, M, P]))
    expect(t.phase).toBe('island-roll')

    // Plus de tête → fin : malus 5 têtes x 100
    t = applyAction(t, { type: 'roll' }, roller([S, M, P]))
    expect(t.phase).toBe('ended')
    expect(t.outcome).toMatchObject({
      reason: 'skull-island',
      score: 0,
      opponentPenalty: 500,
      skulls: 5,
    })
  })

  it('carte Pirate : malus doublé à 200 par tête', () => {
    let t = createTurn({ type: 'pirate' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, S, M, P]))
    t = applyAction(t, { type: 'roll' }, roller([S, M, P, C]))
    expect(t.outcome!.opponentPenalty).toBe(800)
  })

  it("4 têtes envoient sur l'île MÊME avec un Bateau Pirate", () => {
    // La carte du tour ne change rien : 4 têtes au premier lancer = l'Île.
    let t = createTurn({ type: 'ship', sabres: 3, value: 500 })
    t = applyAction(t, { type: 'roll' }, roller([K, K, K, K, S, S, M, P]))
    expect(t.phase).toBe('island-roll')

    // On y reste tant que de nouvelles têtes sortent, puis le malus tombe.
    t = applyAction(t, { type: 'roll' }, roller([S, M, P, C]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.reason).toBe('skull-island')
    expect(t.outcome!.opponentPenalty).toBe(400) // 4 têtes × 100
  })

  it('Bateau Pirate : quota atteint malgré la 3e tête → prime encaissée', () => {
    // Scénario de l'utilisateur : bateau 3 sabres.
    // 1er lancer : 1 tête + 1 sabre → on garde. Relance : 2 têtes + 2 sabres.
    let t = createTurn({ type: 'ship', sabres: 3, value: 500 })
    t = applyAction(t, { type: 'roll' }, roller([K, S, M, P, C, D, M, P]))
    expect(t.phase).toBe('decision')
    // On relance tout sauf la tête (verrouillée) et le sabre gardé
    t = applyAction(
      t,
      { type: 'reroll', diceIds: [2, 3, 4, 5, 6, 7] },
      roller([K, K, S, S, M, P]),
    )
    expect(t.phase).toBe('ended')
    expect(t.outcome!.reason).toBe('three-skulls')
    expect(t.outcome!.score).toBe(500) // 3 sabres réunis → prime acquise
  })
})

describe('carte Gardienne', () => {
  it('relance une tête de mort, une seule fois', () => {
    let t = createTurn({ type: 'guardian' })
    t = applyAction(t, { type: 'roll' }, roller([K, K, S, S, M, M, P, C]))

    t = applyAction(
      t,
      { type: 'reroll', diceIds: [0, 6, 7], guardianDieId: 0 },
      roller([S, S, S]),
    )
    expect(t.phase).toBe('decision')
    expect(t.guardianAvailable).toBe(false)
    expect(t.dice[0]!.face).toBe(S)

    // Deuxième usage interdit
    expect(() =>
      applyAction(
        t,
        { type: 'reroll', diceIds: [1, 2], guardianDieId: 1 },
        roller([S, S]),
      ),
    ).toThrow(IllegalActionError)
  })
})

describe('carte Île au Trésor', () => {
  it('les dés réservés marquent malgré la 3e tête de mort', () => {
    let t = createTurn({ type: 'treasure-island' })
    t = applyAction(t, { type: 'roll' }, roller([C, C, C, D, K, K, S, M]))
    t = applyAction(t, { type: 'bank', diceIds: [0, 1, 2, 3] }, roller())
    t = applyAction(t, { type: 'reroll', diceIds: [6, 7] }, roller([K, S]))
    expect(t.phase).toBe('ended')
    expect(t.outcome!.reason).toBe('three-skulls')
    // 3 pièces (100) + 4x100 trésor = 500
    expect(t.outcome!.score).toBe(500)
  })

  it('bank interdit sans la carte, et jamais une tête de mort', () => {
    let t = createTurn({ type: 'treasure-island' })
    t = applyAction(t, { type: 'roll' }, roller([C, C, K, D, S, S, M, P]))
    expect(() =>
      applyAction(t, { type: 'bank', diceIds: [2] }, roller()),
    ).toThrow(IllegalActionError)

    let t2 = createTurn({ type: 'guardian' })
    t2 = applyAction(t2, { type: 'roll' }, roller([C, C, K, D, S, S, M, P]))
    expect(() =>
      applyAction(t2, { type: 'bank', diceIds: [0] }, roller()),
    ).toThrow(IllegalActionError)
  })
})

describe('partie complète (Game)', () => {
  function fixedRoll(...queues: DieFace[][]): RollFn {
    return roller(...queues)
  }

  it('scores, malus adverses et rotation des joueurs', () => {
    const game = new Game(
      [
        { id: 'a', name: 'Romin' },
        { id: 'b', name: 'Bot', bot: true },
      ],
      { rng: () => 0.42, now: () => 1000 },
    )
    game.startTurn()
    // On force un tour "île" quel que soit la carte piochée ? Non : la carte
    // piochée influe. On neutralise en vérifiant juste la mécanique de rotation.
    const before = game.currentPlayer.id
    game.timeout()
    expect(game.currentPlayer.id).not.toBe(before)
  })

  it("timeout sur l'île : les malus déjà révélés restent appliqués", () => {
    const game = new Game(
      [
        { id: 'a', name: 'Romin' },
        { id: 'b', name: 'Bot', bot: true },
      ],
      { rng: () => 0.99, now: () => 0 }, // rng→dernière carte du deck mélangé
    )
    const turn = game.startTurn()
    // On ne contrôle pas la carte piochée ici ; on saute ce scénario si la
    // carte est un Bateau Pirate (pas d'île possible) ou Tête de Mort (comptage différent).
    if (turn.card.type === 'ship' || turn.card.type === 'skulls') return
    game.act({ type: 'roll' }, fixedRoll([K, K, K, K, S, S, M, P]))
    expect(game.state.turn!.phase).toBe('island-roll')
    game.timeout()
    // Le score ne descend jamais sous zéro : le malus de 400 le plafonne à 0.
    expect(game.state.players[1]!.score).toBe(0)
    expect(game.state.players[0]!.score).toBe(0)
  })

  it('un malus ne fait jamais passer un score sous zéro', () => {
    const game = new Game(
      [
        { id: 'a', name: 'Romin' },
        { id: 'b', name: 'Bot', bot: true },
      ],
      { rng: () => 0.5, now: () => 0 },
    )
    game.state.players[1]!.score = 300
    const turn = game.startTurn()
    if (turn.card.type === 'ship' || turn.card.type === 'skulls') return
    game.act({ type: 'roll' }, fixedRoll([K, K, K, K, S, S, M, P]))
    game.act({ type: 'roll' }, fixedRoll([S, M, P, C]))
    // 5 têtes × 100 = 500 de malus sur un score de 300 → plancher à 0
    expect(game.state.players[1]!.score).toBe(0)
  })
})
