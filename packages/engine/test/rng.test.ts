import { describe, expect, it } from 'vitest'
import { Game } from '../src/game'
import { makeRandomRoller, mulberry32 } from '../src/deck'
import { FACES } from '../src/types'

/**
 * Le tirage a été soupçonné de sortir trop de têtes de mort. On le mesure au
 * lieu d'en débattre : un dé Corsaire porte SIX faces dont UNE tête, donc 1/6
 * par dé. Ce qui trompe l'intuition, c'est le lancer de huit dés à la fois :
 * la probabilité qu'AUCUNE tête ne sorte n'est que de (5/6)^8 ≈ 23 %.
 */
describe('équité du tirage', () => {
  it('chaque face sort à 1/6, à moins de 1 % près', () => {
    const roll = makeRandomRoller(mulberry32(12345))
    const counts = new Map(FACES.map(f => [f, 0]))
    const N = 600_000
    for (const face of roll(N)) counts.set(face, counts.get(face)! + 1)

    for (const face of FACES) {
      const part = counts.get(face)! / N
      expect(Math.abs(part - 1 / 6), `${face} sort à ${(part * 100).toFixed(2)} %`).toBeLessThan(0.01)
    }
  })

  it('le roller par défaut de Game est lui aussi équitable', () => {
    // `Game.act` construit son propre roller : il ne doit pas dévier de FACES.
    const game = new Game([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], {
      rng: mulberry32(777)
    })
    const counts = new Map<string, number>()
    for (let i = 0; i < 40_000; i++) {
      game.state.deck = [{ type: 'guardian' }]
      const turn = game.startTurn()
      game.act({ type: 'roll' })
      for (const d of game.state.turn!.dice) counts.set(d.face!, (counts.get(d.face!) ?? 0) + 1)
      void turn
      // On force la fin du tour pour enchaîner.
      game.state.turn!.phase = 'ended'
      game.state.turn!.outcome = null
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0)
    const skullPart = counts.get('skull')! / total
    expect(Math.abs(skullPart - 1 / 6)).toBeLessThan(0.01)
  })

  it('au moins une tête sur huit dés : ~77 % des lancers, c’est la règle du jeu', () => {
    const roll = makeRandomRoller(mulberry32(999))
    let avecTete = 0
    const N = 50_000
    for (let i = 0; i < N; i++) {
      if (roll(8).includes('skull')) avecTete++
    }
    const part = avecTete / N
    const attendu = 1 - Math.pow(5 / 6, 8) // ≈ 0,767
    expect(Math.abs(part - attendu)).toBeLessThan(0.01)
  })
})
