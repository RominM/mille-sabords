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
  /**
   * Portrait choisi par le joueur. Purement décoratif, donc il s'arrête ici :
   * le moteur ne reçoit que `id`, `name` et `bot` — une règle du jeu ne doit
   * jamais dépendre d'un avatar.
   */
  avatar?: string
}

export interface TableSetup {
  roster: TableSeat[]
  /** Difficulté commune à toutes les IA de la table. */
  difficulty: BotDifficulty
  /**
   * Accompagner le joueur sur son premier tour. Demandé à la mise en place —
   * c'est le seul moment où la question a un sens — et consommé une fois, à
   * l'ouverture de la table.
   */
  tutorial?: boolean
}

/** État partagé (Nuxt `useState` : une seule instance pour toute l'app). */
export const useTableSetup = () => useState<TableSetup | null>('table-setup', () => null)

/**
 * Dernière table solo jouée.
 *
 * `useState` ne survit pas à un rechargement : sans cette mémoire, revenir sur
 * `/game` redemanderait les réglages. Or redemander une partie ne veut pas dire
 * redemander sa mise en place — on repart sur un plateau neuf avec le même
 * équipage et la même difficulté.
 *
 * `localStorage` et non `sessionStorage` : ce n'est pas une identité — que deux
 * onglets partagent la même préférence de jeu ne gêne personne, contrairement
 * au jeton de joueur (cf. `useRoom`).
 */
const LAST_SOLO_KEY = 'rf-last-solo'

export function rememberSoloSetup(setup: TableSetup): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(LAST_SOLO_KEY, JSON.stringify(setup))
  } catch {
    // Stockage plein ou refusé : on joue quand même, on ne mémorise pas.
  }
}

export function lastSoloSetup(): TableSetup | null {
  if (!import.meta.client) return null
  try {
    const setup = JSON.parse(localStorage.getItem(LAST_SOLO_KEY) ?? 'null') as TableSetup | null
    return setup?.roster?.length ? setup : null
  } catch {
    return null
  }
}
