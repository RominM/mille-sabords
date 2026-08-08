/**
 * Mise en mots d'un décompte de tour.
 *
 * Rien n'est calculé ici : tout vient du `breakdown` produit par le moteur, qui
 * fait autorité. On se contente de le rendre lisible — « 3 pièces d'or → +100 »,
 * puis leur bonus de trésor à part, parce que ce sont deux règles différentes et
 * qu'un joueur doit pouvoir refaire l'addition de tête.
 */
import type { DieFace, ScoreBreakdown } from '@rf/engine'
import sabre from '~/assets/images/dice/die-face_sabre.webp'
import skull from '~/assets/images/dice/die-face_skull.webp'
import monkey from '~/assets/images/dice/die-face_monkey.webp'
import parrot from '~/assets/images/dice/die-face_parot.webp'
import coin from '~/assets/images/dice/die-fice_coin.webp'
import diamond from '~/assets/images/dice/die-face_diamond.webp'

export const FACE_IMG: Record<DieFace, string> = { sabre, skull, monkey, parrot, coin, diamond }

const FACE_NAME: Record<DieFace | 'animals', string> = {
  sabre: 'Sabres',
  skull: 'Têtes de mort',
  monkey: 'Singes',
  parrot: 'Perroquets',
  coin: 'Pièces d’or',
  diamond: 'Diamants',
  animals: 'Animaux',
}

export interface ScoreLine {
  icon?: string
  label: string
  points: number
}

export function scoreLines(breakdown: ScoreBreakdown | null): ScoreLine[] {
  if (!breakdown) return []
  const out: ScoreLine[] = []

  // Défi manqué : les dés ne rapportent RIEN, quels qu'ils soient. Les lister
  // laisserait croire à une addition qui ne tombe pas juste.
  if (breakdown.shipResult === 'failed') {
    return [
      {
        icon: FACE_IMG.sabre,
        label: 'Défi du Bateau Pirate échoué',
        points: -breakdown.shipValue,
      },
    ]
  }

  for (const combo of breakdown.combos) {
    out.push({
      icon: combo.face === 'animals' ? undefined : FACE_IMG[combo.face],
      label: `${FACE_NAME[combo.face]} ×${combo.count}`,
      points: combo.points,
    })
  }

  // Les trésors se comptent EN PLUS de la combinaison : trois pièces valent
  // leur combinaison, et chacune vaut encore 100 en tant que trésor.
  for (const treasure of breakdown.treasureDetail) {
    out.push({
      icon: FACE_IMG[treasure.face],
      label: `${FACE_NAME[treasure.face]} ×${treasure.count} — bonus`,
      points: treasure.points,
    })
  }

  if (breakdown.fullChest) out.push({ label: 'Coffre au trésor plein', points: 500 })

  if (breakdown.shipResult === 'success') {
    out.push({
      icon: FACE_IMG.sabre,
      label: 'Défi du Bateau Pirate relevé',
      points: breakdown.shipValue,
    })
  }

  return out
}

export const signed = (points: number): string => (points >= 0 ? `+${points}` : `${points}`)
