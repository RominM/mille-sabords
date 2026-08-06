/**
 * IA de Reckless Fathoms — pas de ML : décision par espérance de gain.
 *
 * À chaque décision, l'IA compare « s'arrêter » et « relancer les dés non
 * marquants ». Pour évaluer une relance, elle énumère TOUS les tirages
 * possibles des dés relancés (loi multinomiale sur 6 faces) et, pour chacun,
 * réutilise le moteur (`applyAction` puis `scoreTurn`) pour obtenir la valeur
 * réelle — 3e tête, Bateau raté, Île au Trésor réservée, etc. sont donc gérés
 * sans dupliquer la moindre règle. L'espérance est exacte (un coup d'avance).
 *
 * Les niveaux de difficulté sont une marge de sécurité (en points) : l'IA ne
 * relance que si l'espérance dépasse le score d'arrêt d'au moins cette marge.
 * Marge élevée → prudente (plus faible) ; marge nulle → EV-optimale à 1 coup.
 *
 * Pure et déterministe (l'énumération ne tire aucun aléatoire) : testable au
 * point près. Réutilisable tel quel par le front (solo) et le serveur.
 */
import type { Game } from './game'
import { scoreTurn } from './scoring'
import { applyAction } from './turn'
import { FACES } from './types'
import type { DieFace, RollFn, TurnAction, TurnState } from './types'

export type BotDifficulty = 'easy' | 'medium' | 'hard'

export interface BotOptions {
  difficulty?: BotDifficulty
}

/** Marge de gain (points) exigée pour préférer la relance à l'arrêt. */
const REROLL_MARGIN: Record<BotDifficulty, number> = {
  easy: 200,
  medium: 75,
  hard: 0,
}

// ─── Helpers de regroupement (mêmes règles de fusion que le scoring) ─────────

function groupKey(face: DieFace, mergeAnimals: boolean): DieFace | 'animals' {
  return mergeAnimals && (face === 'monkey' || face === 'parrot') ? 'animals' : face
}

/**
 * Dés candidats à la relance : ceux qui ne marquent pas encore (hors têtes
 * verrouillées et dés réservés). On garde les pièces/diamants et tout groupe
 * de 3+ identiques ; on relance le reste.
 * Renvoie null si aucune relance sensée n'est possible (moins de 2 dés, ou il
 * faudrait tout relancer sans rien réserver).
 */
export function chooseRerollSet(turn: TurnState): number[] | null {
  const merge = turn.card.type === 'animals'
  const eligible = turn.dice.filter(
    d => d.face !== null && d.face !== 'skull' && !d.locked && !d.banked,
  )

  // Comptage des groupes parmi les dés éligibles pour repérer les marquants.
  const counts = new Map<DieFace | 'animals', number>()
  for (const d of eligible) {
    const key = groupKey(d.face!, merge)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  // Bateau Pirate : les sabres comptent pour le quota (toujours gardés). Tant
  // que le quota n'est pas atteint, un Bateau raté annule tout → pièces,
  // diamants et combos ne « marquent » pas vraiment : autant les relancer pour
  // chasser des sabres. Une fois le quota atteint, les trésors s'ajoutent → on
  // les garde comme d'habitude.
  const card = turn.card
  const isShip = card.type === 'ship'
  const shipMet =
    card.type === 'ship' && turn.dice.filter(d => d.face === 'sabre').length >= card.sabres
  const scores = (face: DieFace): boolean => {
    if (isShip) {
      if (face === 'sabre') return true
      return shipMet && (face === 'coin' || face === 'diamond' || (counts.get(groupKey(face, merge)) ?? 0) >= 3)
    }
    return face === 'coin' || face === 'diamond' || (counts.get(groupKey(face, merge)) ?? 0) >= 3
  }

  let candidates = eligible.filter(d => !scores(d.face!))

  // La règle interdit de relancer l'intégralité des dés : il faut toujours en
  // réserver un. Le cas ne se présente que sans tête de mort et sans rien qui
  // marque — on garde alors le dé du groupe le plus fourni, celui qui a le plus
  // de chances de compléter une combinaison.
  if (candidates.length === turn.dice.length) {
    const keep = candidates.reduce((best, d) =>
      (counts.get(groupKey(d.face!, merge)) ?? 0) > (counts.get(groupKey(best.face!, merge)) ?? 0)
        ? d
        : best,
    )
    candidates = candidates.filter(d => d.id !== keep.id)
  }

  if (candidates.length < 2) return null
  return candidates.map(d => d.id)
}

/** Dés marquants non encore réservés (Île au Trésor) : à mettre de côté. */
export function chooseBankSet(turn: TurnState): number[] {
  if (turn.card.type !== 'treasure-island') return []
  const merge = false // pas de fusion animaux sur l'Île au Trésor
  const active = turn.dice.filter(d => d.face !== null && d.face !== 'skull' && !d.banked)
  const counts = new Map<DieFace | 'animals', number>()
  for (const d of active) counts.set(groupKey(d.face!, merge), (counts.get(groupKey(d.face!, merge)) ?? 0) + 1)
  return active
    .filter(d => {
      const f = d.face!
      return f === 'coin' || f === 'diamond' || (counts.get(groupKey(f, merge)) ?? 0) >= 3
    })
    .map(d => d.id)
}

// ─── Énumération exacte des tirages (multinomiale sur 6 faces) ───────────────

/** Tous les multi-ensembles de `r` faces, avec leur probabilité (somme = 1). */
function faceMultisets(r: number): { faces: DieFace[]; prob: number }[] {
  const F = FACES.length
  const fact: number[] = [1]
  for (let i = 1; i <= r; i++) fact[i] = fact[i - 1]! * i
  const denom = Math.pow(6, r)

  const out: { faces: DieFace[]; prob: number }[] = []
  const counts = new Array(F).fill(0)

  const rec = (idx: number, rem: number): void => {
    if (idx === F - 1) {
      counts[idx] = rem
      let coef = fact[r]!
      for (let i = 0; i < F; i++) coef /= fact[counts[i]!]!
      const faces: DieFace[] = []
      for (let i = 0; i < F; i++) for (let j = 0; j < counts[i]!; j++) faces.push(FACES[i]!)
      out.push({ faces, prob: coef / denom })
      return
    }
    for (let c = 0; c <= rem; c++) {
      counts[idx] = c
      rec(idx + 1, rem - c)
    }
  }
  rec(0, r)
  return out
}

/**
 * Espérance du score si l'on relance `rerollIds` puis que l'on s'arrête
 * (leaf = arrêt). Chaque tirage passe par le moteur : bust, Bateau raté, dés
 * réservés de l'Île au Trésor sont donc valorisés exactement.
 */
export function expectedStopAfterReroll(turn: TurnState, rerollIds: number[]): number {
  let ev = 0
  for (const { faces, prob } of faceMultisets(rerollIds.length)) {
    const roller: RollFn = () => faces
    const next = applyAction(turn, { type: 'reroll', diceIds: rerollIds }, roller)
    const value =
      next.phase === 'ended'
        ? next.outcome!.score // 3e tête / Bateau raté : valeur réelle du moteur
        : scoreTurn(next.dice, next.card).total // survit → on s'arrêterait ici
    ev += prob * value
  }
  return ev
}

// ─── Décision ────────────────────────────────────────────────────────────────

/**
 * Action choisie par l'IA pour l'état de tour courant. À appeler en boucle
 * (voir `playBotTurn`) : sur l'Île au Trésor, elle réserve d'abord les dés
 * marquants, puis tranche entre relancer et s'arrêter.
 */
export function decideAction(turn: TurnState, opts: BotOptions = {}): TurnAction {
  if (turn.phase === 'first-roll' || turn.phase === 'island-roll') return { type: 'roll' }
  if (turn.phase !== 'decision')
    throw new Error('decideAction : le tour est terminé')

  // Île au Trésor : sécuriser les dés marquants avant toute relance.
  const toBank = chooseBankSet(turn)
  if (toBank.length > 0) return { type: 'bank', diceIds: toBank }

  const rerollIds = chooseRerollSet(turn)
  if (rerollIds === null) return { type: 'stop' }

  const stopNow = scoreTurn(turn.dice, turn.card).total
  const ev = expectedStopAfterReroll(turn, rerollIds)
  const margin = REROLL_MARGIN[opts.difficulty ?? 'medium']

  return ev >= stopNow + margin ? { type: 'reroll', diceIds: rerollIds } : { type: 'stop' }
}

/**
 * Déroule tout le tour du joueur courant avec l'IA (le tour doit être ouvert
 * via `game.startTurn()`). Les lancers utilisent le RNG de la partie (vrai
 * aléatoire) ; l'IA n'a servi qu'à choisir les actions. `onStep` permet de
 * journaliser chaque coup (utilisé par la CLI pour l'affichage).
 */
export function playBotTurn(
  game: Game,
  opts: BotOptions = {},
  onStep?: (action: TurnAction, turn: TurnState) => void,
): void {
  for (let guard = 0; guard < 1000; guard++) {
    const turn = game.state.turn
    if (!turn || turn.phase === 'ended') return
    const action = decideAction(turn, opts)
    game.act(action)
    onStep?.(action, game.state.turn!)
  }
  throw new Error('playBotTurn : boucle anormalement longue (bug de décision)')
}
