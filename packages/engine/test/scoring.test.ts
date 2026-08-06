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
  it('+500 quand les 8 dés affichent le MÊME symbole', () => {
    const bd = scoreTurn(dice(Array(8).fill('coin')), guardian)
    // 8 identiques (4000) + 8x100 trésor + 500 coffre = 5300
    expect(bd.fullChest).toBe(true)
    expect(bd.total).toBe(5300)
  })

  it('symboles mélangés : bonus accordé dès que TOUS les dés marquent', () => {
    // 5 pièces (combo) + 3 diamants (combo) : chaque dé rapporte → coffre plein.
    const bd = scoreTurn(
      dice(['coin', 'coin', 'coin', 'coin', 'coin', 'diamond', 'diamond', 'diamond']),
      guardian,
    )
    expect(bd.fullChest).toBe(true)
  })

  it('mélange sans combinaison : le dé isolé qui ne marque pas annule le bonus', () => {
    // 3 sabres (combo) + 4 pièces (chacune 100) + 1 singe seul : le singe ne
    // rapporte rien, donc les huit dés ne marquent pas tous.
    const bd = scoreTurn(
      dice(['sabre', 'sabre', 'sabre', 'coin', 'coin', 'coin', 'coin', 'monkey']),
      guardian,
    )
    expect(bd.fullChest).toBe(false)
  })

  it('pièces et diamants isolés marquent : 8 dés panachés donnent le bonus', () => {
    const bd = scoreTurn(
      dice(['sabre', 'sabre', 'sabre', 'coin', 'diamond', 'coin', 'diamond', 'coin']),
      guardian,
    )
    expect(bd.fullChest).toBe(true)
  })

  it('8 animaux AVEC la carte Animaux : singes + perroquets = une seule valeur', () => {
    const bd = scoreTurn(
      dice(['monkey', 'parrot', 'monkey', 'parrot', 'monkey', 'monkey', 'parrot', 'parrot']),
      { type: 'animals' },
    )
    expect(bd.fullChest).toBe(true)
  })

  it('les mêmes 8 animaux SANS la carte Animaux : deux combinaisons, bonus quand même', () => {
    // 4 singes et 4 perroquets forment deux combinaisons de 4 : chaque dé
    // marque, donc le coffre est plein. Seul le total de points diffère.
    const bd = scoreTurn(
      dice(['monkey', 'parrot', 'monkey', 'parrot', 'monkey', 'monkey', 'parrot', 'parrot']),
      guardian,
    )
    expect(bd.fullChest).toBe(true)
    expect(bd.total).toBe(200 + 200 + 500)
  })

  it('deux singes isolés ne marquent pas : pas de bonus', () => {
    const bd = scoreTurn(
      dice(['monkey', 'monkey', 'parrot', 'parrot', 'parrot', 'parrot', 'parrot', 'parrot']),
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

  it('la carte Tête de Mort ne bloque plus le bonus : seuls les 8 DÉS comptent', () => {
    // ⚠️ Interprétation : le coffre plein se juge sur les dés, pas sur la carte.
    // 8 pièces restent 8 pièces même si la carte apporte une tête de mort.
    const bd = scoreTurn(dice(Array(8).fill('coin')), { type: 'skulls', count: 1 })
    expect(bd.fullChest).toBe(true)
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

  it('Bateau Pirate raté : zéro point ET la valeur de la carte retirée du score', () => {
    // Défi 4 sabres, 1 seul sabre : les pièces accumulées ne rapportent rien,
    // et « on lui retire de son score la valeur indiquée sur la carte ».
    const bd = scoreTurn(
      dice(['sabre', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin']),
      { type: 'ship', sabres: 4, value: 1000 },
    )
    expect(bd.shipResult).toBe('failed')
    expect(bd.total).toBe(-1000)
  })

  it('Bateau Pirate réussi : dés + prime du défi', () => {
    // Scénario de l'utilisateur : défi 4 sabres, 5 sabres obtenus
    // → combo de 5 sabres (500) + prime (1000) = 1500
    const bd = scoreTurn(
      dice(['sabre', 'sabre', 'sabre', 'sabre', 'sabre', 'monkey', 'parrot', 'monkey']),
      { type: 'ship', sabres: 4, value: 1000 },
    )
    expect(bd.shipResult).toBe('success')
    expect(bd.total).toBe(1500)
  })

  it('tour perdu sur 3 têtes, quota atteint : la prime du défi reste acquise', () => {
    // La règle des 3 têtes annule « les combinaisons de DÉS » ; le défi du
    // bateau se juge sur les sabres et reste donc gagné.
    const bd = scoreTurn(
      dice(['skull', 'sabre', 'skull', 'skull', 'sabre', 'sabre', 'coin', 'monkey']),
      { type: 'ship', sabres: 3, value: 500 },
      { shipOnly: true },
    )
    expect(bd.shipResult).toBe('success')
    expect(bd.total).toBe(500) // les dés ne marquent pas, la prime si
  })

  it('tour perdu sur 3 têtes sans le quota : zéro ET la pénalité de la carte', () => {
    const bd = scoreTurn(
      dice(['skull', 'sabre', 'skull', 'skull', 'coin', 'coin', 'coin', 'monkey']),
      { type: 'ship', sabres: 3, value: 500 },
      { shipOnly: true },
    )
    expect(bd.shipResult).toBe('failed')
    expect(bd.total).toBe(-500)
  })

  it('« Magie pirate » : 9 symboles identiques emportent la partie', () => {
    // 8 pièces aux dés + la carte Pièce d'or = 9 symboles identiques.
    const bd = scoreTurn(
      dice(['coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin']),
      { type: 'coin' },
    )
    expect(bd.instantWin).toBe(true)
  })

  it('8 symboles identiques sans carte : pas de victoire immédiate', () => {
    const bd = scoreTurn(
      dice(['coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin']),
      guardian,
    )
    expect(bd.instantWin).toBe(false)
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
