import { describe, expect, it } from 'vitest'
import { scoreLines, signed } from '~/utils/scoreLines'
import { scoreTurn } from '@rf/engine'
import type { Die, DieFace } from '@rf/engine'

/**
 * La mise en mots d'un décompte. Elle ne calcule rien — le moteur fait autorité
 * — mais elle doit dire TOUT ce qu'il a compté, et rien d'autre : c'est là que
 * le joueur refait son addition.
 *
 * Les décomptes viennent donc du vrai moteur, jamais d'un objet écrit à la
 * main : un `breakdown` inventé prouverait seulement que le test se comprend
 * lui-même.
 */
const dice = (faces: DieFace[]): Die[] =>
  faces.map((face, id) => ({ id, face, locked: face === 'skull', banked: false }))

describe('mise en mots d’un décompte', () => {
  it('ne dit rien d’un tour sans décompte', () => {
    expect(scoreLines(null)).toEqual([])
  })

  it('énonce la combinaison ET le bonus de trésor, séparément', () => {
    // 3 pièces : une combinaison à 100, plus 100 par pièce en tant que trésor.
    const breakdown = scoreTurn(dice(['coin', 'coin', 'coin', 'sabre', 'monkey', 'parrot', 'sabre', 'monkey']), {
      type: 'guardian',
    })
    const lines = scoreLines(breakdown)

    expect(lines.map(l => l.label)).toEqual(['Pièces d’or ×3', 'Pièces d’or ×3 — bonus'])
    expect(lines.map(l => l.points)).toEqual([100, 300])
  })

  it('annonce le coffre plein quand les huit dés marquent', () => {
    const breakdown = scoreTurn(
      dice(['coin', 'coin', 'coin', 'diamond', 'sabre', 'sabre', 'sabre', 'diamond']),
      { type: 'guardian' },
    )
    expect(breakdown.fullChest).toBe(true)
    expect(scoreLines(breakdown).some(l => l.label === 'Coffre au trésor plein')).toBe(true)
  })

  it('sur un défi manqué, ne liste AUCUN dé — seulement la perte', () => {
    // Bateau à 3 sabres, un seul sorti : le défi tombe, et les pièces avec.
    const breakdown = scoreTurn(
      dice(['sabre', 'coin', 'coin', 'coin', 'monkey', 'parrot', 'monkey', 'parrot']),
      { type: 'ship', sabres: 3, value: 500 },
    )
    const lines = scoreLines(breakdown)

    expect(lines).toHaveLength(1)
    expect(lines[0]!.label).toBe('Défi du Bateau Pirate échoué')
    expect(lines[0]!.points).toBe(-500)
  })

  it('sur un défi relevé, ajoute la prime aux dés', () => {
    const breakdown = scoreTurn(
      dice(['sabre', 'sabre', 'sabre', 'coin', 'monkey', 'parrot', 'monkey', 'parrot']),
      { type: 'ship', sabres: 3, value: 500 },
    )
    const lines = scoreLines(breakdown)

    expect(lines.at(-1)).toMatchObject({ label: 'Défi du Bateau Pirate relevé', points: 500 })
    expect(lines.length).toBeGreaterThan(1)
  })

  it('les animaux n’ont pas d’icône : la combinaison n’est celle d’aucune face', () => {
    const breakdown = scoreTurn(
      dice(['monkey', 'monkey', 'parrot', 'parrot', 'sabre', 'coin', 'diamond', 'sabre']),
      { type: 'animals' },
    )
    const animals = scoreLines(breakdown).find(l => l.label.startsWith('Animaux'))
    expect(animals).toBeDefined()
    expect(animals!.icon).toBeUndefined()
  })
})

describe('signe des points', () => {
  it('marque toujours le gain, et laisse la perte parler d’elle-même', () => {
    expect(signed(100)).toBe('+100')
    expect(signed(0)).toBe('+0')
    expect(signed(-500)).toBe('-500')
  })
})
