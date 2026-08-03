/**
 * Composition de la table, transmise du lobby à la partie.
 *
 * C'est le seul lien entre les deux écrans : le lobby y dépose l'équipage
 * (joueurs humains et IA) puis navigue vers la partie, qui le consomme.
 * En multijoueur, cet objet viendra du serveur au lieu d'être construit
 * localement — la forme ne changera pas.
 */
import type { BotDifficulty } from '@rf/engine'

export interface TableSeat {
  id: string
  name: string
  bot: boolean
}

export interface TableSetup {
  roster: TableSeat[]
  /** Difficulté commune à toutes les IA de la table. */
  difficulty: BotDifficulty
}

/** État partagé (Nuxt `useState` : une seule instance pour toute l'app). */
export const useTableSetup = () => useState<TableSetup | null>('table-setup', () => null)
