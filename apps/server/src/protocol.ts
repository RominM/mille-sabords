/**
 * Protocole client ↔ serveur.
 *
 * Le client ne DEMANDE jamais un résultat : il annonce une intention, le serveur
 * arbitre et rediffuse l'état à toute la salle. C'est ce qui rend la triche
 * inopérante — un message forgé est simplement refusé.
 */
import type { BotDifficulty, GameState, TurnAction } from '@rf/engine'

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
  | { t: 'state'; game: GameState; youId: string }
  /** Règle ou droit refusé. Jamais fatal : la salle continue. */
  | { t: 'error'; message: string }
