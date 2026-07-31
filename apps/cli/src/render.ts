/**
 * Rendu texte du jeu pour le terminal. Fonctions pures : elles lisent l'état
 * du moteur et produisent des chaînes. Aucune règle n'est calculée ici.
 */
import type {
  Die,
  GameState,
  PirateCard,
  ScoreBreakdown,
  TurnOutcome,
  TurnState,
} from '@ms/engine'
import { WINNING_SCORE } from '@ms/engine'
import { FACE_INFO } from './faces.ts'

// ─── Couleurs ANSI (désactivables) ───────────────────────────────────────────

const useColor = process.stdout.isTTY === true && !process.env.NO_COLOR

function paint(code: number, s: string): string {
  return useColor ? `\x1b[${code}m${s}\x1b[0m` : s
}
export const dim = (s: string) => paint(2, s)
export const bold = (s: string) => paint(1, s)
export const gold = (s: string) => paint(33, s)
export const red = (s: string) => paint(31, s)
export const cyan = (s: string) => paint(36, s)
export const green = (s: string) => paint(32, s)

// ─── Dés ─────────────────────────────────────────────────────────────────────

function renderDie(die: Die): string {
  if (die.face === null) return dim(`[${die.id}] ·  (non lancé)`)
  const info = FACE_INFO[die.face]
  const tags: string[] = []
  if (die.locked) tags.push(red('🔒 maudite'))
  if (die.banked) tags.push(cyan('🏝️ réservé'))
  const suffix = tags.length ? '  ' + tags.join(' ') : ''
  const label = paint(info.color, info.label.padEnd(13))
  return `[${die.id}] ${info.emoji} ${label}${suffix}`
}

export function renderDice(dice: Die[]): string {
  return dice.map(renderDie).join('\n')
}

/** Résumé compact d'une ligne : symboles des 8 dés dans l'ordre. */
export function renderDiceStrip(dice: Die[]): string {
  return dice
    .map(d => {
      if (d.face === null) return '·'
      const e = FACE_INFO[d.face].emoji.trim()
      if (d.locked) return red(e)
      if (d.banked) return cyan(e)
      return e
    })
    .join(' ')
}

// ─── Carte Pirate ────────────────────────────────────────────────────────────

export function describeCard(card: PirateCard): { name: string; effect: string } {
  switch (card.type) {
    case 'treasure-island':
      return {
        name: 'Île au Trésor',
        effect:
          "Réserve des dés (bank) : ils restent acquis même si tu perds le tour sur 3 têtes.",
      }
    case 'pirate':
      return {
        name: 'Pirate',
        effect: 'Points du tour DOUBLÉS. Malus de l’Île de la Tête-de-Mort doublé (200/tête).',
      }
    case 'skulls':
      return {
        name: `Tête de Mort ×${card.count}`,
        effect: `${card.count} tête(s) de mort offerte(s) dès le départ (comptent dans le total).`,
      }
    case 'guardian':
      return {
        name: 'Gardienne (Sorcière)',
        effect: 'Relance UNE tête de mort, une seule fois dans le tour (commande « guard »).',
      }
    case 'ship':
      return {
        name: `Bateau Pirate — ${card.sabres} sabres`,
        effect: `Réunis ${card.sabres} sabres → +${card.value}. Sinon −${card.value}. Jamais d’Île.`,
      }
    case 'coin':
      return {
        name: "Pièce d'or",
        effect: 'Une pièce virtuelle en plus (+100, compte pour les combos et le coffre plein).',
      }
    case 'diamond':
      return {
        name: 'Diamant',
        effect: 'Un diamant virtuel en plus (+100, compte pour les combos et le coffre plein).',
      }
    case 'animals':
      return {
        name: 'Animaux',
        effect: 'Singes et perroquets comptent comme un seul et même symbole.',
      }
  }
}

// ─── Score ───────────────────────────────────────────────────────────────────

function comboLabel(face: ScoreBreakdown['combos'][number]['face']): string {
  if (face === 'animals') return 'Animaux'
  return FACE_INFO[face].label
}

export function renderBreakdown(b: ScoreBreakdown): string {
  const lines: string[] = []
  for (const c of b.combos) {
    lines.push(`  ${c.count}× ${comboLabel(c.face)} → ${gold(String(c.points))} pts`)
  }
  if (b.treasures > 0) lines.push(`  Trésors (pièces + diamants) → ${gold('+' + b.treasures)} pts`)
  if (b.fullChest) lines.push(`  Coffre au trésor plein → ${gold('+500')} pts`)
  if (b.shipResult === 'success') lines.push(`  Bateau Pirate réussi ✅`)
  if (b.shipResult === 'failed') lines.push(`  Bateau Pirate raté ❌`)
  if (b.doubled) lines.push(`  ${cyan('Carte Pirate : total doublé ×2')}`)
  if (lines.length === 0) lines.push(dim('  (aucune combinaison marquante)'))
  lines.push(`  ${bold('Total du tour : ' + b.total + ' pts')}`)
  return lines.join('\n')
}

export function renderOutcome(outcome: TurnOutcome): string {
  const lines: string[] = []
  switch (outcome.reason) {
    case 'stopped':
      lines.push(green('Arrêt volontaire.'))
      break
    case 'three-skulls':
      lines.push(red(`3ᵉ tête de mort — tour perdu (${outcome.skulls} têtes).`))
      break
    case 'skull-island':
      lines.push(
        red(
          `Île de la Tête-de-Mort — ${outcome.skulls} têtes. ` +
            `Chaque adversaire perd ${outcome.opponentPenalty} pts.`,
        ),
      )
      break
  }
  if (outcome.breakdown) lines.push(renderBreakdown(outcome.breakdown))
  else lines.push(`  ${bold('Score du joueur : ' + outcome.score + ' pts')}`)
  return lines.join('\n')
}

// ─── Tableau des scores ──────────────────────────────────────────────────────

export function renderScoreboard(state: GameState): string {
  const width = Math.max(...state.players.map(p => p.name.length))
  const lines = state.players.map((p, i) => {
    const arrow = i === state.currentPlayerIndex && state.phase === 'playing' ? gold('▶ ') : '  '
    const name = p.name.padEnd(width)
    const near = p.score >= WINNING_SCORE ? green(String(p.score)) : String(p.score)
    return `${arrow}${name}  ${near.padStart(6)} pts`
  })
  return lines.join('\n')
}

// ─── En-tête de tour ─────────────────────────────────────────────────────────

export function renderTurnHeader(playerName: string, turn: TurnState): string {
  const card = describeCard(turn.card)
  return [
    bold(`\n═══ Tour de ${playerName} ═══`),
    `Carte : ${gold(card.name)}`,
    dim(card.effect),
  ].join('\n')
}
