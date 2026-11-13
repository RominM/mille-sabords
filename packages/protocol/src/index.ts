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
 * Le temps que la volée met à RETOMBER, dernier dé compris.
 *
 * Le moteur tranche le tour à l'instant du jet, mais le score ne s'affiche
 * qu'une fois les dés posés. Le serveur doit donc ajouter ce temps-là au
 * récapitulatif, sinon le score était amputé de la durée du vol (~3 s sur 5).
 * Le front en vérifie la cohérence avec son réglage du jet (`DICE_THROW`).
 */
export const ROLL_SETTLE_MS = 1_700

/**
 * Durée de l'annonce « À toi de jouer ».
 *
 * Partagée : le front l'affiche, le serveur la retranche du temps de décision —
 * le joueur ne doit pas perdre ses premières secondes à lire l'annonce.
 */
export const TURN_CALL_MS = 2_500

/**
 * Cadence de l'IA : le temps qu'elle laisse entre deux de ses gestes.
 *
 * Partagé pour la même raison que `RECAP_MS` : le serveur l'applique, le front
 * l'observe. Il doit rester SUPÉRIEUR à la durée d'un jet de dés, sinon l'IA
 * relance par-dessus ses propres dés encore en vol et personne ne voit jamais
 * ce qu'elle a obtenu.
 */
export const BOT_STEP_MS = 2_600

/**
 * Codes de salle : sans I, O, 0 ni 1 — ils se dictent à l'oral sans ambiguïté.
 *
 * Partagé, car les deux bouts en tirent : le serveur quand il ouvre une salle
 * lui-même, le front quand l'hôte génère son code AVANT d'embarquer pour
 * pouvoir le partager. Deux alphabets qui divergeraient donneraient des codes
 * que l'un des deux ne saurait pas lire.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 4

export const makeRoomCode = (): string =>
  Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]
  ).join('')

/**
 * Rangement des dés dans les huit cadres : un identifiant de dé par cadre, ou
 * `null` pour un cadre vide.
 *
 * Ce n'est PAS une règle — le moteur ignore tout des cadres. C'est ce que le
 * joueur actif a choisi de garder, et dans quel ordre : la seule chose que les
 * autres ne pouvaient pas voir, puisque l'état de jeu ne connaît que les têtes
 * verrouillées. Sans elle, ils regardaient un plateau muet et ne pouvaient pas
 * commenter les choix de celui qui joue.
 */
export type TableSlots = (number | null)[]

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
   *
   * `create` accompagne un code TIRÉ par l'hôte : il ouvre la salle à ce
   * code-là au lieu de la rejoindre. Sans lui, un code inconnu reste une faute
   * de frappe — et non une invitation à ouvrir une salle par mégarde.
   */
  | { t: 'join'; code?: string; create?: boolean; token: string; name: string; avatar: string }
  | { t: 'ready'; ready: boolean }
  | { t: 'add-bot' }
  | { t: 'remove-seat'; seatId: string }
  | { t: 'difficulty'; value: BotDifficulty }
  | { t: 'start' }
  | { t: 'act'; action: TurnAction }
  /** Le joueur actif annonce son rangement. Relayé tel quel, sans arbitrage de règle. */
  | { t: 'table'; slots: TableSlots }

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
  /** Rangement du joueur ACTIF, pour que toute la table le voie. */
  | { t: 'table'; slots: TableSlots }
  /** Règle ou droit refusé. Jamais fatal : la salle continue. */
  | { t: 'error'; message: string }
