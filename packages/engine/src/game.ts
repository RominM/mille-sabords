import { buildDeck, shuffle } from './deck'
import { applyAction, createTurn } from './turn'
import type { PirateCard, RollFn, TurnAction, TurnState } from './types'

export const WINNING_SCORE = 6000

/**
 * Délai par DÉCISION (lancer, relancer, s'arrêter), et non par tour complet :
 * le compte repart à zéro à chaque lancer. Un joueur peut donc relancer autant
 * qu'il veut — ce qu'on borne, c'est le temps passé à choisir ses dés.
 */
export const DECISION_TIMEOUT_MS = 35_000

export interface Player {
  id: string
  name: string
  score: number
  /** true = joueur IA */
  bot: boolean
}

export type GamePhase = 'playing' | 'finished'

export interface GameState {
  players: Player[]
  currentPlayerIndex: number
  deck: PirateCard[]
  discard: PirateCard[]
  turn: TurnState | null
  phase: GamePhase
  winnerId: string | null
  /** Deadline epoch-ms de la décision en cours (autorité serveur) */
  decisionDeadline: number | null
  /**
   * Dernier tour : quand un joueur franchit 6000, chaque AUTRE joueur a droit à
   * un dernier tour. `finalTurnsLeft` = nombre de tours restants avant la fin
   * (null tant que le seuil n'est pas franchi). Le vainqueur est le meilleur
   * score à l'issue de ce dernier tour, pas forcément le déclencheur.
   */
  finalTurnsLeft: number | null
  /**
   * « Si après la dernière manche, le joueur qui avait obtenu 6000 points en
   * reperd, le jeu se poursuit jusqu'à ce que quelqu'un atteigne à nouveau les
   * 6000 points. » Dans ce régime, le premier à repasser le seuil gagne
   * immédiatement, sans déclencher de nouvelle manche.
   */
  suddenDeath: boolean
}

export interface GameOptions {
  rng?: () => number
  now?: () => number
}

/**
 * Partie complète. Classe fine au-dessus du réducteur de tour :
 * pioche/défausse, application des scores et malus, rotation des joueurs,
 * timeout d'inactivité (0 point, malus île déjà "sur la table" conservés).
 */
export class Game {
  state: GameState
  private rng: () => number
  private now: () => number

  constructor(
    players: { id: string; name: string; bot?: boolean }[],
    opts: GameOptions = {},
  ) {
    if (players.length < 2 || players.length > 5)
      throw new Error('Reckless Fathoms se joue de 2 à 5 joueurs')
    this.rng = opts.rng ?? Math.random
    this.now = opts.now ?? Date.now
    this.state = {
      players: players.map(p => ({ ...p, bot: p.bot ?? false, score: 0 })),
      currentPlayerIndex: 0,
      deck: shuffle(buildDeck(), this.rng),
      discard: [],
      turn: null,
      phase: 'playing',
      winnerId: null,
      decisionDeadline: null,
      finalTurnsLeft: null,
      suddenDeath: false,
    }
  }

  get currentPlayer(): Player {
    return this.state.players[this.state.currentPlayerIndex]!
  }

  /** Révèle la carte Pirate et ouvre le tour du joueur courant. */
  startTurn(): TurnState {
    if (this.state.phase !== 'playing') throw new Error('Partie terminée')
    if (this.state.turn && this.state.turn.phase !== 'ended')
      throw new Error('Un tour est déjà en cours')

    if (this.state.deck.length === 0) {
      this.state.deck = shuffle(this.state.discard, this.rng)
      this.state.discard = []
    }
    const card = this.state.deck.pop()!
    this.state.turn = createTurn(card)
    this.armDeadline()
    return this.state.turn
  }

  /** Applique une action du joueur courant (validée par le moteur). */
  act(action: TurnAction, roll?: RollFn): TurnState {
    if (!this.state.turn) throw new Error('Aucun tour en cours')
    const roller =
      roll ??
      ((count: number) =>
        Array.from({ length: count }, () => {
          const faces = ['sabre', 'skull', 'monkey', 'parrot', 'coin', 'diamond'] as const
          return faces[Math.floor(this.rng() * 6)]!
        }))
    this.state.turn = applyAction(this.state.turn, action, roller)
    if (this.state.turn.phase === 'ended') this.settleTurn()
    else this.armDeadline()
    return this.state.turn
  }

  /**
   * Timeout d'inactivité : 0 point pour le joueur, on passe au suivant.
   * Règle maison validée : les malus "déjà sur la table" restent appliqués —
   * si le joueur était sur l'Île de la Tête-de-Mort, les têtes déjà révélées
   * pénalisent bien les adversaires.
   */
  timeout(): void {
    const turn = this.state.turn
    if (!turn || turn.phase === 'ended') return

    // Le joueur a déjà lancé : on applique un arrêt volontaire plutôt que de le
    // sanctionner. Il encaisse ce qu'il a sur la table, et la partie avance —
    // c'est tout l'objet du minuteur : ne jamais rester bloqué sur un absent.
    // (Avec trois têtes, `stop` clôt de toute façon le tour comme perdu.)
    if (turn.phase === 'decision') {
      this.act({ type: 'stop' })
      return
    }

    if (turn.phase === 'island-roll') {
      const perSkull = turn.card.type === 'pirate' ? 200 : 100
      const skulls =
        turn.dice.filter(d => d.face === 'skull').length +
        (turn.card.type === 'skulls' ? turn.card.count : 0)
      this.applyOpponentPenalty(skulls * perSkull)
    }
    // Dans tous les cas : 0 point pour le joueur actif
    this.state.turn = { ...turn, phase: 'ended', outcome: null }
    this.concludeTurn(turn.card)
  }

  isTimedOut(): boolean {
    return (
      this.state.decisionDeadline !== null &&
      this.now() > this.state.decisionDeadline
    )
  }

  // ─── Interne ───────────────────────────────────────────────────────────────

  private armDeadline(): void {
    this.state.decisionDeadline = this.now() + DECISION_TIMEOUT_MS
  }

  /**
   * La règle ne pose aucun plancher : un score PEUT devenir négatif, que ce
   * soit par les malus de l'Île de la Tête-de-Mort ou par un Bateau Pirate raté.
   */
  private applyOpponentPenalty(penalty: number): void {
    if (penalty <= 0) return
    this.state.players.forEach((p, i) => {
      if (i !== this.state.currentPlayerIndex) p.score -= penalty
    })
  }

  private settleTurn(): void {
    const turn = this.state.turn!
    const outcome = turn.outcome!
    this.currentPlayer.score += outcome.score
    this.applyOpponentPenalty(outcome.opponentPenalty)

    // « Magie pirate » : 9 symboles identiques emportent la partie sur-le-champ,
    // sans dernière manche ni comparaison des scores.
    if (outcome.breakdown?.instantWin) {
      this.state.discard.push(turn.card)
      this.state.phase = 'finished'
      this.state.decisionDeadline = null
      this.state.winnerId = this.currentPlayer.id
      return
    }
    this.concludeTurn(turn.card)
  }

  /**
   * Fin de tour : gère le déclenchement et le décompte du dernier tour.
   * - En dernier tour : on décompte ; à 0, la partie se termine.
   * - Sinon, si le joueur courant franchit 6000 : on ARME le dernier tour
   *   (un tour pour chaque autre joueur) au lieu de terminer immédiatement.
   * - Sinon : rotation normale.
   */
  private concludeTurn(card: PirateCard): void {
    // Mort subite : le seuil a déjà été franchi puis reperdu. Le premier qui le
    // repasse gagne sur-le-champ, sans nouvelle dernière manche.
    if (this.state.suddenDeath) {
      if (this.currentPlayer.score >= WINNING_SCORE) return this.finish(card)
      return this.rotate(card)
    }
    if (this.state.finalTurnsLeft !== null) {
      this.state.finalTurnsLeft -= 1
      if (this.state.finalTurnsLeft <= 0) return this.endFinalRound(card)
      return this.rotate(card)
    }
    if (this.currentPlayer.score >= WINNING_SCORE) {
      this.state.finalTurnsLeft = this.state.players.length - 1
      if (this.state.finalTurnsLeft <= 0) return this.endFinalRound(card)
      return this.rotate(card)
    }
    this.rotate(card)
  }

  /**
   * Clôture de la dernière manche. Si plus personne n'atteint le seuil — le
   * déclencheur ayant reperdu ses points entre-temps —, la partie se poursuit
   * en mort subite au lieu de désigner un vainqueur sous les 6000.
   */
  private endFinalRound(card: PirateCard): void {
    const best = Math.max(...this.state.players.map(p => p.score))
    if (best >= WINNING_SCORE) return this.finish(card)
    this.state.finalTurnsLeft = null
    this.state.suddenDeath = true
    this.rotate(card)
  }

  /** Clôt la partie : meilleur score = vainqueur (départage : ordre de jeu). */
  private finish(card: PirateCard): void {
    this.state.discard.push(card)
    this.state.phase = 'finished'
    this.state.decisionDeadline = null
    const winner = this.state.players.reduce((best, p) =>
      p.score > best.score ? p : best,
    )
    this.state.winnerId = winner.id
  }

  private rotate(card: PirateCard): void {
    this.state.discard.push(card)
    this.state.currentPlayerIndex =
      (this.state.currentPlayerIndex + 1) % this.state.players.length
    this.state.decisionDeadline = null
  }
}
