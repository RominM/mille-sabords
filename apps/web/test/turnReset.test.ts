import { afterEach, describe, expect, it } from 'vitest'
import { Game, type DieFace, type GameState } from '@rf/engine'
import { useDiceSlots } from '~/composables/game/useDiceSlots'
import { DICE_THROW } from '~/utils/diceThrow'
import { useGame } from '~/composables/game/useGame'
import type { GameCommand, GameTransport } from '~/composables/game/useGameTransport'
import type { TableSlots } from '@rf/protocol'

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

/**
 * Transport DISTANT factice : l'état ne bouge que quand le « serveur » publie,
 * et l'on garde trace de ce que le client lui envoie.
 */
function remoteTransport(me: string) {
  const state = shallowRef<GameState | null>(null)
  const sent: GameCommand[] = []
  const transport: GameTransport = {
    state,
    lastError: ref(''),
    remote: true,
    table: ref<TableSlots | null>(null),
    youId: ref(me),
    send: (cmd) => void sent.push(cmd),
    close: () => {},
  }
  return {
    transport,
    sent,
    publish: (game: Game) => (state.value = structuredClone(game.state)),
  }
}

/** Deux pirates ; Anne commence. Des cartes sans effet sur la sélection. */
function twoPirates(): Game {
  const game = new Game([
    { id: 'a', name: 'Anne' },
    { id: 'b', name: 'Bart' },
  ])
  // L'Île au Trésor transformerait la sélection en réserve envoyée au serveur.
  game.state.deck = [{ type: 'coin' }, { type: 'coin' }]
  return game
}

let scope: ReturnType<typeof effectScope> | null = null

afterEach(() => scope?.stop())

describe('ouverture d’un tour en multijoueur', () => {
  it('la sélection du tour précédent est oubliée', async () => {
    const game = twoPirates()
    const { transport, publish } = remoteTransport('a')

    scope = effectScope()
    const ui = scope.run(() => useGame(transport))!

    // Tour d'Anne : elle lance, garde les dés 6 et 7, puis s'arrête.
    game.startTurn()
    publish(game)
    game.act({ type: 'roll' }, faces([S, S, M, M, P, P, C, D]))
    publish(game)
    await nextTick()
    ui.toggleDie(6)
    ui.toggleDie(7)
    await nextTick()
    expect(ui.keptIds.value).toEqual([6, 7])
    game.act({ type: 'stop' })
    publish(game)
    await nextTick()

    // Le serveur ouvre le tour de Bart, qui lance sans faire de tête de mort.
    game.startTurn()
    publish(game)
    await nextTick()
    game.act({ type: 'roll' }, faces([S, S, M, M, P, P, C, D]))
    publish(game)
    await nextTick()

    // Aucun dé ne doit avoir été rangé à sa place : personne n'a rien gardé.
    expect(ui.keptIds.value).toEqual([])
    expect(ui.slots.value.every((id) => id === null)).toBe(true)
  })
})

describe('rangement partagé en multijoueur', () => {
  it('le joueur actif envoie son rangement au serveur', async () => {
    const game = twoPirates()
    const { transport, sent, publish } = remoteTransport('a')
    scope = effectScope()
    const ui = scope.run(() => useGame(transport))!

    game.startTurn()
    publish(game)
    game.act({ type: 'roll' }, faces([S, S, M, M, P, P, C, D]))
    publish(game)
    await nextTick()
    ui.toggleDie(6)
    await nextTick()
    ui.moveToSlot(6, 3)
    await nextTick()

    const tables = sent.filter((c) => c.type === 'table')
    expect(tables.at(-1)).toEqual({ type: 'table', slots: [null, null, null, 6, null, null, null, null] })
  })

  it('le spectateur voit les dés gardés par le joueur actif, à SA place', async () => {
    const game = twoPirates()
    const { transport, sent, publish } = remoteTransport('b')
    scope = effectScope()
    const ui = scope.run(() => useGame(transport))!

    game.startTurn()
    publish(game)
    game.act({ type: 'roll' }, faces([S, S, M, M, P, P, C, D]))
    publish(game)
    await nextTick()
    // Anne garde le diamant et une pièce, rangés à sa façon : le serveur relaie.
    transport.table.value = [null, 7, null, null, 6, null, null, null]
    await nextTick()

    expect([...ui.keptIds.value].sort()).toEqual([6, 7])
    expect(ui.slots.value).toEqual([null, 7, null, null, 6, null, null, null])
    // Et le spectateur, lui, n'envoie rien : ce n'est pas son rangement.
    expect(sent.filter((c) => c.type === 'table')).toHaveLength(0)
  })
})
