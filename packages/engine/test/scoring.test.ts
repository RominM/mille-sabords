import { describe, expect, it } from 'vitest'
import { scoreTurn } from '../src/scoring'
import type { Die, DieFace, PirateCard } from '../src/types'

function dice(faces: DieFace[], banked: number[] = []): Die[] {
  return faces.map((face, id) => ({
    id,
    face,
    locked: face === 'skull',
    banked: banked.includes(id),
  }))
}

const guardian: PirateCard = { type: 'guardian' } // carte sans effet sur le score

describe('combinaisons', () => {
  it('barème 3 à 8 identiques', () => {
    const cases: [number, number][] = [
      [3, 100],
      [4, 200],
      [5, 500],
      [6, 1000],
      [7, 2000],
      [8, 4000],
    ]
    for (const [n, pts] of cases) {
      const faces: DieFace[] = [
        ...Array(n).fill('sabre'),
        ...Array(8 - n).fill('skull'),
      ]
      // NB : 8 - n têtes de mort > 2 ne survient pas en jeu réel pour n < 6,
      // mais le scoring reste une fonction pure testable indépendamment.
      const bd = scoreTurn(dice(faces), guardian)
      expect(bd.combos).toEqual([{ face: 'sabre', count: n, points: pts }])
    }
  })

  it('exemple du PDF : 200 combo + 400 trésor = 600 pour 4 pièces + reste sans combo', () => {
    const bd = scoreTurn(
      dice(['coin', 'coin', 'coin', 'coin', 'sabre', 'sabre', 'monkey', 'parrot']),
      guardian,
    )
    expect(bd.combos).toEqual([{ face: 'coin', count: 4, points: 200 }])
    expect(bd.treasures).toBe(400)
    expect(bd.total).toBe(600)
  })
})

describe('coffre au trésor plein', () => {
  it('+500 quand les 8 dés marquent', () => {
    const bd = scoreTurn(
      dice(['coin', 'coin', 'coin', 'coin', 'sabre', 'sabre', 'sabre', 'coin']),
      guardian,
    )
    // 5 pièces (500) + 3 sabres (100) + 5x100 trésor + 500 coffre = 1600
    expect(bd.fullChest).toBe(true)
    expect(bd.total).toBe(1600)
  })

  it('pas de bonus si un dé ne marque pas', () => {
    const bd = scoreTurn(
      dice(['coin', 'coin', 'coin', 'coin', 'sabre', 'sabre', 'sabre', 'monkey']),
      guardian,
    )
    expect(bd.fullChest).toBe(false)
  })

  it('une tête de mort bloque toujours le bonus', () => {
    const bd = scoreTurn(
      dice(['coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'skull']),
      guardian,
    )
    expect(bd.fullChest).toBe(false)
  })

  it('la carte Tête de Mort bloque le bonus (dé virtuel non marquant)', () => {
    const bd = scoreTurn(
      dice(Array(8).fill('coin')),
      { type: 'skulls', count: 1 },
    )
    expect(bd.fullChest).toBe(false)
  })
})

describe('cartes Pirate', () => {
  it("Pièce d'or : dé virtuel, combo + trésor + coffre plein possible", () => {
    // 8 sabres + carte pièce : 8 identiques (4000) + 100 trésor + 500 coffre
    const bd = scoreTurn(dice(Array(8).fill('sabre')), { type: 'coin' })
    expect(bd.total).toBe(4600)
    expect(bd.fullChest).toBe(true)
  })

  it('9 identiques (8 dés + carte diamant) plafonnés au barème de 8', () => {
    const bd = scoreTurn(dice(Array(8).fill('diamond')), { type: 'diamond' })
    // combo 9→4000 + 9x100 trésor + 500 coffre
    expect(bd.total).toBe(5400)
  })

  it('Animaux : singes + perroquets fusionnent (exemple du PDF : 2+3 = 500)', () => {
    const bd = scoreTurn(
      dice(['parrot', 'parrot', 'monkey', 'monkey', 'monkey', 'skull', 'skull', 'sabre']),
      { type: 'animals' },
    )
    expect(bd.combos).toEqual([{ face: 'animals', count: 5, points: 500 }])
  })

  it('Pirate : total doublé', () => {
    const bd = scoreTurn(
      dice(['sabre', 'sabre', 'sabre', 'coin', 'skull', 'skull', 'monkey', 'parrot']),
      { type: 'pirate' },
    )
    // (100 combo + 100 trésor) x2
    expect(bd.total).toBe(400)
    expect(bd.doubled).toBe(true)
  })

  it('Bateau Pirate réussi : bonus ajouté', () => {
    const bd = scoreTurn(
      dice(['sabre', 'sabre', 'sabre', 'sabre', 'coin', 'monkey', 'monkey', 'parrot']),
      { type: 'ship', sabres: 3, value: 500 },
    )
    // combo 4 sabres (200) + 100 trésor + 500 bonus
    expect(bd.shipResult).toBe('success')
    expect(bd.total).toBe(800)
  })

  it('Bateau Pirate raté : score = -valeur, peu importe les dés', () => {
    const bd = scoreTurn(
      dice(['sabre', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin']),
      { type: 'ship', sabres: 4, value: 1000 },
    )
    expect(bd.shipResult).toBe('failed')
    expect(bd.total).toBe(-1000)
  })
})

describe('Île au Trésor — 3e tête de mort, seuls les dés réservés marquent', () => {
  it('score des dés réservés uniquement, sans coffre plein', () => {
    const d = dice(
      ['coin', 'coin', 'coin', 'diamond', 'skull', 'skull', 'skull', 'sabre'],
      [0, 1, 2, 3], // 3 pièces + 1 diamant réservés
    )
    const bd = scoreTurn(d, { type: 'treasure-island' }, { bankedOnly: true })
    // combo 3 pièces (100) + 4x100 trésor
    expect(bd.total).toBe(500)
    expect(bd.fullChest).toBe(false)
  })
})
