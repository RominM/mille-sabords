import { afterEach, describe, expect, it } from 'vitest'
import { Game, type DieFace, type GameState } from '@rf/engine'
import { useDiceSlots } from '~/composables/game/useDiceSlots'
import { DICE_THROW } from '~/utils/diceThrow'
import { useGame } from '~/composables/game/useGame'
import type { GameTransport } from '~/composables/game/useGameTransport'

/**
 * Les dés gardés au tour précédent ne doivent pas ressurgir au tour suivant.
 *
 * Le cas vécu en partie réelle, en MULTI : le serveur ouvre les tours de
 * lui-même, `startTurn` n'est jamais appelé côté client, et la sélection du tour
 * d'avant survivait. Les dés portant les mêmes numéros d'un tour à l'autre, ceux
 * gardés la fois précédente sautaient seuls dans les cadres au premier lancer.
 */

// Imports automatiques de Nuxt dont `useGame` a besoin, hors de Nuxt.
Object.assign(globalThis, { useDiceSlots, DICE_THROW })

const S = 'sabre' as const
const M = 'monkey' as const
const P = 'parrot' as const
const C = 'coin' as const
const D = 'diamond' as const

const faces = (list: DieFace[]) => () => list

/** Transport DISTANT factice : l'état ne bouge que quand le « serveur » publie. */
function remoteTransport(): GameTransport & { publish: (game: Game) => void } {
  const state = shallowRef<GameState | null>(null)
  return {
    state,
    lastError: ref(''),
    remote: true,
    send: () => {},
    close: () => {},
    publish: (game) => (state.value = structuredClone(game.state)),
  }
}

let scope: ReturnType<typeof effectScope> | null = null

afterEach(() => scope?.stop())

describe('ouverture d’un tour en multijoueur', () => {
  it('la sélection du tour précédent est oubliée', async () => {
    const game = new Game([
      { id: 'a', name: 'Anne' },
      { id: 'b', name: 'Bart' },
    ])
    // Des cartes sans effet sur la sélection : l'Île au Trésor, elle, la
    // transformerait en réserve envoyée au serveur.
    game.state.deck = [{ type: 'coin' }, { type: 'coin' }]
    const transport = remoteTransport()

    scope = effectScope()
    const ui = scope.run(() => useGame(transport))!

    // Tour d'Anne : elle lance, garde les dés 6 et 7, puis s'arrête.
    game.startTurn()
    transport.publish(game)
    game.act({ type: 'roll' }, faces([S, S, M, M, P, P, C, D]))
    transport.publish(game)
    await nextTick()
    ui.toggleDie(6)
    ui.toggleDie(7)
    await nextTick()
    expect(ui.keptIds.value).toEqual([6, 7])
    game.act({ type: 'stop' })
    transport.publish(game)
    await nextTick()

    // Le serveur ouvre le tour de Bart, qui lance sans faire de tête de mort.
    game.startTurn()
    transport.publish(game)
    await nextTick()
    game.act({ type: 'roll' }, faces([S, S, M, M, P, P, C, D]))
    transport.publish(game)
    await nextTick()

    // Aucun dé ne doit avoir été rangé à sa place : personne n'a rien gardé.
    expect(ui.keptIds.value).toEqual([])
    expect(ui.slots.value.every((id) => id === null)).toBe(true)
  })
})
