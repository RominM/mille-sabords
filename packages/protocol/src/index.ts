/**
 * Protocole client ↔ serveur.
 *
 * Le client ne DEMANDE jamais un résultat : il annonce une intention, le serveur
 * arbitre et rediffuse l'état à toute la salle. C'est ce qui rend la triche
 * inopérante — un message forgé est simplement refusé.
 */
import type { BotDifficulty, GameState, TurnAction } from '@rf/engine'

/**
 * Temps laissé au résultat d'un tour avant d'enchaîner.
 *
 * Partagé, et pas dupliqué de chaque côté : le serveur s'en sert pour ouvrir le
 * tour suivant, le front pour savoir combien de temps afficher le score. Deux
 * valeurs qui divergeraient donneraient un écran qui s'efface avant la fin, ou
 * un plateau qui repart sous un score encore affiché.
 */
export const RECAP_MS = 5_000

/**
 * Cadence de l'IA : le temps qu'elle laisse entre deux de ses gestes.
 *
 * Partagé pour la même raison que `RECAP_MS` : le serveur l'applique, le front
 * l'observe. Il doit rester SUPÉRIEUR à la durée d'un jet de dés, sinon l'IA
 * relance par-dessus ses propres dés encore en vol et personne ne voit jamais
 * ce qu'elle a obtenu.
 */
export const BOT_STEP_MS = 2_600

/** Un siège tel que le voient tous les joueurs pendant la salle d'attente. */
export interface SeatView {
  id: string
  name: string
  avatar: string
  bot: boolean
  ready: boolean
  /** Faux quand le joueur a fermé son onglet : son siège l'attend. */
  connected: boolean
}

export interface LobbyView {
  code: string
  hostId: string | null
  difficulty: BotDifficulty
  seats: SeatView[]
  /** Vrai dès que la partie est lancée : les invités rejoignent en cours. */
  started: boolean
}

export type ClientMessage =
  /**
   * Sans `code`, on crée une salle ; avec, on la rejoint. Le `token` identifie
   * le joueur d'une session à l'autre : c'est lui qui rend sa place après un
   * rechargement.
   */
  | { t: 'join'; code?: string; token: string; name: string; avatar: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'add-bot' }
  | { t: 'remove-seat'; seatId: string }
  | { t: 'difficulty'; value: BotDifficulty }
  | { t: 'start' }
  | { t: 'act'; action: TurnAction }

export type ServerMessage =
  | { t: 'joined'; code: string; youId: string }
  | { t: 'lobby'; lobby: LobbyView }
  /**
   * Composition de la table PENDANT la partie.
   *
   * L'état de jeu ne transporte ni portrait ni état de connexion : un avatar ne
   * regarde pas les règles, et le moteur reste ainsi sans rien savoir du réseau.
   * On les diffuse donc à part — sans quoi un rechargement en pleine partie
   * laisserait l'écran sans visages, la vue de salle n'étant plus émise.
   */
  | { t: 'roster'; seats: SeatView[] }
  | { t: 'state'; game: GameState; youId: string }
  /** Règle ou droit refusé. Jamais fatal : la salle continue. */
  | { t: 'error'; message: string }
