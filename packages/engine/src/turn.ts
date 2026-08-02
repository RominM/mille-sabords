import { scoreTurn } from './scoring'
import type {
  Die,
  PirateCard,
  RollFn,
  TurnAction,
  TurnOutcome,
  TurnState,
} from './types'

export const DICE_COUNT = 8

/** Erreur d'action illégale : le serveur autoritaire la renvoie au client tricheur/bugué */
export class IllegalActionError extends Error {}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cardSkulls(card: PirateCard): number {
  return card.type === 'skulls' ? card.count : 0
}

function diceSkulls(dice: Die[]): number {
  return dice.filter(d => d.face === 'skull').length
}

export function totalSkulls(state: TurnState): number {
  return diceSkulls(state.dice) + cardSkulls(state.card)
}

function lockSkulls(dice: Die[]): void {
  for (const d of dice) if (d.face === 'skull') d.locked = true
}

function clone(state: TurnState): TurnState {
  return structuredClone(state)
}

// ─── Création du tour ────────────────────────────────────────────────────────

export function createTurn(card: PirateCard): TurnState {
  return {
    card,
    dice: Array.from({ length: DICE_COUNT }, (_, id) => ({
      id,
      face: null,
      locked: false,
      banked: false,
    })),
    phase: 'first-roll',
    rolls: 0,
    guardianAvailable: card.type === 'guardian',
    outcome: null,
  }
}

// ─── Fins de tour ────────────────────────────────────────────────────────────

function endStopped(state: TurnState): void {
  const breakdown = scoreTurn(state.dice, state.card)
  state.phase = 'ended'
  state.outcome = {
    reason: 'stopped',
    score: breakdown.total,
    opponentPenalty: 0,
    breakdown,
    skulls: totalSkulls(state),
  }
}

function endThreeSkulls(state: TurnState): void {
  let score = 0
  let breakdown: TurnOutcome['breakdown'] = null

  if (state.card.type === 'treasure-island' && state.dice.some(d => d.banked)) {
    // Les dés réservés sur l'Île au Trésor marquent malgré la 3e tête
    breakdown = scoreTurn(state.dice, state.card, { bankedOnly: true })
    score = breakdown.total
  } else if (state.card.type === 'ship') {
    // Bateau Pirate : les dés ne marquent pas, mais la prime reste acquise si le
    // quota de sabres a été atteint — les sabres du lancer fatal comptent aussi.
    breakdown = scoreTurn(state.dice, state.card, { shipOnly: true })
    score = breakdown.total
  }

  state.phase = 'ended'
  state.outcome = {
    reason: 'three-skulls',
    score,
    opponentPenalty: 0,
    breakdown,
    skulls: totalSkulls(state),
  }
}

function endIsland(state: TurnState): void {
  const perSkull = state.card.type === 'pirate' ? 200 : 100
  state.phase = 'ended'
  state.outcome = {
    reason: 'skull-island',
    score: 0,
    opponentPenalty: totalSkulls(state) * perSkull,
    breakdown: null,
    skulls: totalSkulls(state),
  }
}

// ─── Résolution des lancers ──────────────────────────────────────────────────

function resolveFirstRoll(state: TurnState): void {
  lockSkulls(state.dice)
  const skulls = totalSkulls(state)

  // 4 têtes de mort ou plus au premier lancer → Île de la Tête-de-Mort,
  // quelle que soit la carte du tour (Bateau Pirate compris).
  if (skulls >= 4) {
    state.phase = 'island-roll'
    return
  }
  if (skulls >= 3) {
    endThreeSkulls(state)
    return
  }
  state.phase = 'decision'
}

function resolveReroll(state: TurnState): void {
  lockSkulls(state.dice)
  if (totalSkulls(state) >= 3) {
    endThreeSkulls(state)
    return
  }
  state.phase = 'decision'
}

function resolveIslandRoll(state: TurnState, newSkulls: number): void {
  lockSkulls(state.dice)
  const remaining = state.dice.filter(d => d.face !== 'skull').length
  // L'île s'arrête si aucun nouveau crâne n'est sorti, OU s'il ne reste plus
  // assez de dés pour relancer (il en faut au moins deux). Sans cette seconde
  // condition, le joueur se retrouverait bloqué : plus de lancer possible et
  // aucune autre action disponible.
  if (newSkulls === 0 || remaining < 2) {
    endIsland(state)
    return
  }
  state.phase = 'island-roll'
}

// ─── Réducteur principal ─────────────────────────────────────────────────────

/**
 * Applique une action au tour et retourne le nouvel état (immutable).
 * Toute action illégale lève IllegalActionError : c'est la couche
 * d'autorité que le serveur multijoueur réutilisera telle quelle.
 */
export function applyAction(
  prev: TurnState,
  action: TurnAction,
  roll: RollFn,
): TurnState {
  if (prev.phase === 'ended')
    throw new IllegalActionError('Le tour est terminé')

  const state = clone(prev)

  switch (action.type) {
    case 'roll': {
      if (state.phase === 'first-roll') {
        const faces = roll(DICE_COUNT)
        state.dice.forEach((d, i) => (d.face = faces[i]!))
        state.rolls = 1
        resolveFirstRoll(state)
        return state
      }
      if (state.phase === 'island-roll') {
        const rollable = state.dice.filter(d => d.face !== 'skull')
        const faces = roll(rollable.length)
        rollable.forEach((d, i) => (d.face = faces[i]!))
        state.rolls++
        resolveIslandRoll(state, diceSkulls(rollable))
        return state
      }
      throw new IllegalActionError('Utilise "reroll" avec une sélection de dés')
    }

    case 'reroll': {
      if (state.phase !== 'decision')
        throw new IllegalActionError('Relance impossible dans cette phase')

      const ids = new Set(action.diceIds)
      if (ids.size !== action.diceIds.length)
        throw new IllegalActionError('Dés en double dans la sélection')

      // Gardienne : une tête de mort relançable, une seule fois dans le tour
      if (action.guardianDieId !== undefined) {
        if (!state.guardianAvailable)
          throw new IllegalActionError('Gardienne indisponible')
        const die = state.dice.find(d => d.id === action.guardianDieId)
        if (!die || die.face !== 'skull')
          throw new IllegalActionError("La Gardienne ne relance qu'une tête de mort")
        if (!ids.has(die.id))
          throw new IllegalActionError("Le dé Gardienne doit faire partie de la sélection")
        die.locked = false
        state.guardianAvailable = false
      }

      const selected = state.dice.filter(d => ids.has(d.id))
      if (selected.length !== ids.size)
        throw new IllegalActionError('Dé inconnu dans la sélection')
      if (selected.some(d => d.locked))
        throw new IllegalActionError('Les têtes de mort sont maudites, non relançables')
      if (selected.some(d => d.banked))
        throw new IllegalActionError("Reprends d'abord les dés de l'Île au Trésor (unbank)")
      if (selected.length < 2)
        throw new IllegalActionError('Une relance se fait avec au moins deux dés')
      // Rien n'oblige à réserver un dé : relancer tous les dés relançables est
      // permis (les têtes de mort restent verrouillées de toute façon).

      const faces = roll(selected.length)
      selected.forEach((d, i) => (d.face = faces[i]!))
      state.rolls++
      resolveReroll(state)
      return state
    }

    case 'bank':
    case 'unbank': {
      if (state.phase !== 'decision')
        throw new IllegalActionError('Action impossible dans cette phase')
      if (state.card.type !== 'treasure-island')
        throw new IllegalActionError("Réserve possible uniquement avec l'Île au Trésor")
      const banking = action.type === 'bank'
      for (const id of action.diceIds) {
        const die = state.dice.find(d => d.id === id)
        if (!die) throw new IllegalActionError('Dé inconnu')
        if (die.face === 'skull')
          throw new IllegalActionError('Une tête de mort ne se réserve pas')
        if (die.banked === banking)
          throw new IllegalActionError(banking ? 'Dé déjà réservé' : 'Dé non réservé')
        die.banked = banking
      }
      return state
    }

    case 'stop': {
      if (state.phase !== 'decision')
        throw new IllegalActionError("Impossible de s'arrêter dans cette phase")
      endStopped(state)
      return state
    }
  }
}
