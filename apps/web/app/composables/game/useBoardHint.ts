import type { TurnState } from '@rf/engine'
import type { HintTone } from '~/components/board/BoardHint.vue'

export interface BoardHint {
  text: string
  tone: HintTone
}

interface HintContext {
  turn: Ref<TurnState | null>
  /** Message d'erreur du moteur, s'il vient d'en refuser un. */
  transient: Ref<string>
  /** Tête de mort que la Gardienne emportera à la prochaine relance. */
  guardianDie: Ref<number | null>
  /** Têtes de mort en jeu, carte comprise. */
  skulls: Ref<number>
  /** Le siège actif est le mien : la Gardienne ne s'explique qu'à son joueur. */
  mine: Ref<boolean>
  /** Vrai pendant le tour de l'IA : on ne lui explique pas les règles. */
  botTurn: Ref<boolean>
  canRoll: Ref<boolean>
}

/**
 * La phrase d'aide du plateau, et son ton.
 *
 * Rassemblée ici plutôt qu'en cascade de `v-if` dans le template : l'ordre des
 * cas EST la règle — un refus du moteur prime sur tout, la Gardienne prime sur
 * l'Île au Trésor —, et cet ordre se lit mal éclaté entre des balises.
 *
 * Rend `null` quand il n'y a rien à dire, ce qui vaut mieux qu'une ligne vide
 * qui garderait sa place.
 */
export function useBoardHint(context: HintContext) {
  const { turn, transient, guardianDie, skulls, mine, botTurn, canRoll } = context

  return computed<BoardHint | null>(() => {
    if (botTurn.value) return null

    const phase = turn.value?.phase
    if (phase === 'island-roll') {
      return { text: 'Île de la Tête-de-Mort : relance forcée tant que des têtes sortent.', tone: 'info' }
    }

    if (phase !== 'decision') {
      return canRoll.value ? { text: 'Lance les dés', tone: 'info' } : null
    }

    if (transient.value) return { text: `⛔ ${transient.value}`, tone: 'danger' }

    // La Gardienne part d'office : le joueur n'a rien à faire, mais il doit
    // savoir qu'une tête va quitter son cadre — et, à trois têtes, que
    // s'arrêter ne rapporte rien puisque seule la relance le sauve.
    if (guardianDie.value !== null && mine.value) {
      if (skulls.value >= 3) {
        return {
          text: '🗝 3 têtes de mort — la Gardienne en renvoie une avec ta relance. T’arrêter maintenant ne rapporte rien.',
          tone: 'guardian'
        }
      }
      // Le rappel du dé à garder n'est pas décoratif : la tête emportée compte
      // dans la relance, et relancer les sept autres ferait huit dés.
      return {
        text: '🗝 Gardienne : ta tête de mort repart d’office avec ta prochaine relance — garde au moins un dé.',
        tone: 'guardian'
      }
    }

    if (turn.value?.card.type === 'treasure-island') {
      return {
        text: 'Île au Trésor : les dés que tu gardes sont réservés sur la carte — reclique pour les reprendre.',
        tone: 'info'
      }
    }

    return {
      text: 'Sélectionne les dés que tu veux GARDER, puis relance les autres — ou arrête-toi.',
      tone: 'info'
    }
  })
}
