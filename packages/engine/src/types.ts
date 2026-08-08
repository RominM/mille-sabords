/**
 * Types du moteur Reckless Fathoms.
 * Le moteur est 100% pur (aucune dépendance framework) : il sera partagé
 * entre le front (mode solo vs IA) et le serveur autoritaire (multijoueur).
 */

export type DieFace =
  | 'sabre'
  | 'skull'
  | 'monkey'
  | 'parrot'
  | 'coin'
  | 'diamond'

export const FACES: readonly DieFace[] = [
  'sabre',
  'skull',
  'monkey',
  'parrot',
  'coin',
  'diamond',
] as const

/** Un dé Corsaire sur la table. */
export interface Die {
  id: number
  /** null tant que le premier lancer n'a pas eu lieu */
  face: DieFace | null
  /** true = tête de mort maudite, non relançable (sauf Gardienne, une fois) */
  locked: boolean
  /** true = mis de côté sur la carte Île au Trésor */
  banked: boolean
}

// ─── Cartes Pirate ───────────────────────────────────────────────────────────

export type PirateCard =
  | { type: 'treasure-island' }
  | { type: 'pirate' }
  | { type: 'skulls'; count: 1 | 2 }
  | { type: 'guardian' }
  | { type: 'ship'; sabres: number; value: number }
  | { type: 'coin' }
  | { type: 'diamond' }
  | { type: 'animals' }

// ─── Tour de jeu ─────────────────────────────────────────────────────────────

export type TurnPhase =
  /** Avant le premier lancer (les 8 dés obligatoires) */
  | 'first-roll'
  /** Le joueur choisit : s'arrêter, relancer, gérer l'Île au Trésor */
  | 'decision'
  /** Île de la Tête-de-Mort : lancers forcés jusqu'à un lancer sans tête */
  | 'island-roll'
  | 'ended'

export type TurnEndReason =
  /** Arrêt volontaire, points marqués */
  | 'stopped'
  /** 3e tête de mort : 0 point (sauf dés réservés sur l'Île au Trésor) */
  | 'three-skulls'
  /** Île de la Tête-de-Mort terminée : malus pour les adversaires */
  | 'skull-island'

/**
 * Trace d'un tour joué, pour l'historique de la partie.
 *
 * Volontairement maigre : de quoi relire « qui, combien, pourquoi », pas de
 * quoi rejouer le tour. L'historique part dans CHAQUE diffusion d'état en
 * multijoueur — le détail complet coûterait cher pour un écran qu'on consulte
 * de temps en temps.
 *
 * `timeout` n'est pas une fin de tour au sens des règles mais au sens du jeu en
 * ligne : le joueur n'a pas décidé à temps.
 */
export interface TurnRecord {
  playerId: string
  score: number
  reason: TurnEndReason | 'timeout'
  /** Malus subi par chaque adversaire, pour expliquer un score qui baisse. */
  opponentPenalty: number
}

export interface ScoreBreakdown {
  /** Points des combinaisons (3+ dés identiques) */
  combos: { face: DieFace | 'animals'; count: number; points: number }[]
  /** +100 par pièce et par diamant (cartes virtuelles incluses) */
  treasures: number
  /** Le même total, détaillé par symbole — pour un récapitulatif lisible. */
  treasureDetail: { face: 'coin' | 'diamond'; count: number; points: number }[]
  /** +500 si les 8 dés marquent tous des points */
  fullChest: boolean
  /** Bonus ou malus de la carte Bateau Pirate */
  shipResult: 'success' | 'failed' | null
  /** Valeur en jeu sur la carte Bateau : gagnée si réussi, retirée si raté. */
  shipValue: number
  /** true si la carte Pirate double le total */
  doubled: boolean
  /**
   * « Magie pirate » : 9 symboles identiques (8 dés + une carte Pièce d'or ou
   * Diamant de la même face) font gagner la partie sur-le-champ.
   */
  instantWin: boolean
  /** Total final (peut être négatif avec un Bateau Pirate raté) */
  total: number
}

export interface TurnOutcome {
  reason: TurnEndReason
  /** Points pour le joueur actif (négatif possible : Bateau Pirate raté) */
  score: number
  /** Malus appliqué à CHAQUE adversaire (Île de la Tête-de-Mort) */
  opponentPenalty: number
  breakdown: ScoreBreakdown | null
  /** Nombre total de têtes de mort révélées (dés + carte) */
  skulls: number
}

export interface TurnState {
  card: PirateCard
  dice: Die[]
  phase: TurnPhase
  /** Nombre de lancers effectués ce tour */
  rolls: number
  /** Gardienne encore utilisable ce tour */
  guardianAvailable: boolean
  outcome: TurnOutcome | null
}

// ─── Actions (validées par le moteur — base de l'autorité serveur) ──────────

export type TurnAction =
  /** Premier lancer, ou lancer forcé sur l'Île de la Tête-de-Mort */
  | { type: 'roll' }
  /** Relance des dés sélectionnés. guardianDieId : la tête de mort relancée via Gardienne */
  | { type: 'reroll'; diceIds: number[]; guardianDieId?: number }
  /** Île au Trésor : réserver des dés */
  | { type: 'bank'; diceIds: number[] }
  /** Île au Trésor : reprendre des dés réservés */
  | { type: 'unbank'; diceIds: number[] }
  /** Arrêt volontaire : les points sont comptés */
  | { type: 'stop' }

/** Fonction de lancer injectable : Math.random en prod, files de faces en test */
export type RollFn = (count: number) => DieFace[]
