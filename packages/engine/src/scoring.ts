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
      instantWin: false,
      // La 3e tête annule TOUS les points du tour, prime du bateau comprise.
      // En revanche la pénalité de la carte n'est due que si le quota de sabres
      // n'a pas été atteint : le défi, lui, a bien été relevé.
      total: success || card.type !== 'ship' ? 0 : -card.value,
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

  // Coffre au trésor plein (+500) : « quand un joueur marque des points avec ses
  // huit dés ». Chaque dé doit donc rapporter quelque chose — soit en faisant
  // partie d'une combinaison d'au moins 3 symboles, soit en étant une pièce d'or
  // ou un diamant, qui valent 100 à eux seuls.
  //
  // Un mélange est donc valable : 3 sabres + 3 singes + 1 pièce + 1 diamant
  // donne le bonus. Une seule tête de mort le fait tomber, puisqu'elle ne
  // rapporte jamais rien.
  //
  // Le jugement porte sur les 8 DÉS. Les faces virtuelles d'une carte Pièce ou
  // Diamant comptent en revanche dans la taille des combinaisons (elles peuvent
  // faire passer un groupe à 3), et une carte Tête de Mort ne bloque rien : ce
  // n'est pas un dé lancé.
  const chestKey = (f: DieFace): DieFace | 'animals' =>
    merge && (f === 'monkey' || f === 'parrot') ? 'animals' : f
  const scores = (f: DieFace): boolean =>
    f !== 'skull' && (f === 'coin' || f === 'diamond' || (counts.get(chestKey(f)) ?? 0) >= 3)
  const fullChest =
    !opts.bankedOnly &&
    dice.length > 0 &&
    realFaces.length === dice.length &&
    realFaces.every(scores)

  // « Magie pirate » : 9 symboles identiques emportent la partie sur-le-champ.
  // Seule une carte Pièce d'or ou Diamant peut faire un 9e symbole.
  const instantWin = !opts.bankedOnly && [...counts].some(([f, n]) => f !== 'skull' && n >= 9)

  let total =
    combos.reduce((s, c) => s + c.points, 0) + treasures + (fullChest ? 500 : 0)

  // Bateau Pirate : le défi est OBLIGATOIRE pour marquer.
  // Réussi → les dés comptent normalement, plus la prime de la carte.
  // Raté   → aucun point, ET la valeur de la carte est RETIRÉE du score.
  let shipResult: ScoreBreakdown['shipResult'] = null
  if (card.type === 'ship') {
    const sabres = realFaces.filter(f => f === 'sabre').length
    if (!opts.bankedOnly && sabres >= card.sabres) {
      shipResult = 'success'
      total += card.value
    } else {
      shipResult = 'failed'
      total = -card.value
    }
  }

  // Carte Pirate : points du tour doublés. Jamais combinée à un Bateau — une
  // seule carte est révélée par tour — donc la pénalité n'est pas concernée.
  const doubled = card.type === 'pirate'
  if (doubled) total *= 2

  return { combos, treasures, fullChest, shipResult, doubled, instantWin, total }
}
