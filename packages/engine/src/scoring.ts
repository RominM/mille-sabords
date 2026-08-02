import type { Die, DieFace, PirateCard, ScoreBreakdown } from './types'

/** Barème des combinaisons de dés identiques */
const COMBO_POINTS: Record<number, number> = {
  3: 100,
  4: 200,
  5: 500,
  6: 1000,
  7: 2000,
  8: 4000,
}

function comboPoints(count: number): number {
  // 9 identiques possibles avec une carte Pièce/Diamant : plafonné au barème max
  return COMBO_POINTS[Math.min(count, 8)] ?? 0
}

/**
 * Faces "virtuelles" apportées par la carte Pirate du tour.
 * Pièce d'or / Diamant : comptent comme un dé supplémentaire (combos + coffre plein).
 * Têtes de mort : dés supplémentaires qui ne marquent jamais → bloquent le coffre plein.
 */
function virtualFaces(card: PirateCard): DieFace[] {
  if (card.type === 'coin') return ['coin']
  if (card.type === 'diamond') return ['diamond']
  if (card.type === 'skulls') return Array(card.count).fill('skull')
  return []
}

export interface ScoreOptions {
  /**
   * Fin de tour par 3e tête de mort avec la carte Île au Trésor :
   * seuls les dés réservés (banked) marquent, pas de coffre plein,
   * pas d'évaluation Bateau Pirate côté sabres réussis.
   */
  bankedOnly?: boolean
  /**
   * Tour perdu sur la 3e tête de mort avec une carte Bateau Pirate :
   * les dés ne marquent plus, MAIS la prime du bateau reste acquise si le quota
   * de sabres a été atteint — les sabres sont comptés en même temps que les
   * têtes de mort du lancer fatal.
   */
  shipOnly?: boolean
}

/**
 * Calcule le score d'un tour à partir des dés visibles et de la carte.
 * Fonction pure : c'est elle que le serveur autoritaire ré-exécutera.
 */
export function scoreTurn(
  dice: Die[],
  card: PirateCard,
  opts: ScoreOptions = {},
): ScoreBreakdown {
  const scoringDice = opts.bankedOnly ? dice.filter(d => d.banked) : dice
  const realFaces = scoringDice
    .map(d => d.face)
    .filter((f): f is DieFace => f !== null)

  // Tour perdu (3 têtes) avec un Bateau Pirate : les dés ne marquent pas, mais
  // la prime reste due si le quota de sabres a été atteint.
  if (opts.shipOnly) {
    const sabres = realFaces.filter(f => f === 'sabre').length
    const success = card.type === 'ship' && sabres >= card.sabres
    return {
      combos: [],
      treasures: 0,
      fullChest: false,
      shipResult: card.type === 'ship' ? (success ? 'success' : 'failed') : null,
      doubled: false,
      total: success && card.type === 'ship' ? card.value : 0,
    }
  }
  const faces = opts.bankedOnly
    ? realFaces // les faces virtuelles de carte ne sont pas "réservables"
    : [...realFaces, ...virtualFaces(card)]

  // Regroupement — carte Animaux : singes + perroquets = même symbole
  const merge = card.type === 'animals'
  const counts = new Map<DieFace | 'animals', number>()
  for (const f of faces) {
    const key = merge && (f === 'monkey' || f === 'parrot') ? 'animals' : f
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  // Combinaisons (les têtes de mort ne combotent jamais)
  const combos: ScoreBreakdown['combos'] = []
  for (const [face, count] of counts) {
    if (face === 'skull') continue
    if (count >= 3) combos.push({ face, count, points: comboPoints(count) })
  }

  // +100 par pièce et par diamant (en plus des combos)
  const treasures =
    100 * ((counts.get('coin') ?? 0) + (counts.get('diamond') ?? 0))

  // Coffre au trésor plein (+500) : les 8 DÉS rapportent tous des points —
  // aucun dé inutile, aucune tête de mort parmi les dés. Un dé marque s'il est
  // pièce/diamant ou membre d'une combinaison de 3+.
  // Le jugement porte sur les dés seuls : une carte Tête de Mort ne bloque donc
  // pas le bonus (8 pièces restent 8 pièces), et une carte Pièce/Diamant peut
  // en revanche compléter une combinaison.
  const chestKey = (f: DieFace): DieFace | 'animals' =>
    merge && (f === 'monkey' || f === 'parrot') ? 'animals' : f
  const fullChest =
    !opts.bankedOnly &&
    dice.length > 0 &&
    realFaces.length === dice.length &&
    realFaces.every(f => {
      if (f === 'skull') return false
      if (f === 'coin' || f === 'diamond') return true
      return (counts.get(chestKey(f)) ?? 0) >= 3
    })

  let total =
    combos.reduce((s, c) => s + c.points, 0) + treasures + (fullChest ? 500 : 0)

  // Bateau Pirate : le défi est OBLIGATOIRE pour marquer.
  // Réussi  → les dés comptent normalement + la prime de la carte.
  // Raté    → aucun point du tout (même les dés), mais aucune pénalité non plus.
  let shipResult: ScoreBreakdown['shipResult'] = null
  if (card.type === 'ship') {
    const sabres = realFaces.filter(f => f === 'sabre').length
    if (!opts.bankedOnly && sabres >= card.sabres) {
      shipResult = 'success'
      total += card.value
    } else {
      shipResult = 'failed'
      total = 0
    }
  }

  // Carte Pirate : points du tour doublés
  const doubled = card.type === 'pirate'
  if (doubled) total *= 2

  return { combos, treasures, fullChest, shipResult, doubled, total }
}
