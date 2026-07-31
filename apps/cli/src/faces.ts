/**
 * Affichage terminal des faces de dé + parsing des saisies clavier.
 * Aucune logique de jeu ici : uniquement de la présentation et de la lecture
 * d'entrée. Les règles restent 100% dans @ms/engine.
 */
import type { DieFace } from '@ms/engine'

export interface FaceInfo {
  /** Emoji d'affichage */
  emoji: string
  /** Libellé français */
  label: string
  /** Lettres acceptées en saisie manuelle des dés (mode debug) */
  keys: string[]
  /** Code couleur ANSI (30-37) */
  color: number
}

/** ordre d'affichage stable, aligné sur FACES du moteur */
export const FACE_INFO: Record<DieFace, FaceInfo> = {
  sabre: { emoji: '⚔️ ', label: 'Sabre', keys: ['s'], color: 37 },
  skull: { emoji: '💀', label: 'Tête de mort', keys: ['k', 't'], color: 90 },
  monkey: { emoji: '🐵', label: 'Singe', keys: ['m'], color: 33 },
  parrot: { emoji: '🦜', label: 'Perroquet', keys: ['p'], color: 32 },
  coin: { emoji: '🪙', label: "Pièce d'or", keys: ['c', 'o'], color: 33 },
  diamond: { emoji: '💎', label: 'Diamant', keys: ['d'], color: 36 },
}

/** Convertit une lettre saisie en face de dé (mode dés manuels), ou null. */
export function parseFace(token: string): DieFace | null {
  const t = token.trim().toLowerCase()
  for (const face of Object.keys(FACE_INFO) as DieFace[]) {
    if (FACE_INFO[face].keys.includes(t)) return face
  }
  return null
}

/** Rappel des lettres acceptées, pour l'aide à la saisie manuelle. */
export function faceKeyLegend(): string {
  return (Object.keys(FACE_INFO) as DieFace[])
    .map(f => `${FACE_INFO[f].keys[0]}=${FACE_INFO[f].label}`)
    .join(', ')
}
