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
  /** Tête de mort confiée à la Gardienne. */
  guardianDie: Ref<number | null>
  guardianOffered: Ref<boolean>
  /** Les 3 têtes sont là et la Gardienne va devoir servir. */
  guardianRescue: Ref<boolean>
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
  const { turn, transient, guardianDie, guardianOffered, guardianRescue, botTurn, canRoll } =
    context

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

    // Trois têtes sont sorties : le tour est perdu si le joueur s'arrête. La
    // Gardienne partira d'office avec la relance — il n'a rien à désigner, mais
    // il doit savoir que c'est SA dernière carte, et qu'elle se joue en relançant.
    if (guardianRescue.value) {
      return {
        text: '🗝 3 têtes de mort — la Gardienne en renverra une avec ta prochaine relance. T’arrêter maintenant ne rapporte rien.',
        tone: 'guardian'
      }
    }

    if (guardianDie.value !== null) {
      return {
        text: '🗝 Tête de mort confiée à la Gardienne — elle repartira à la relance.',
        tone: 'guardian'
      }
    }

    if (guardianOffered.value) {
      return {
        text: '🗝 Gardienne : clique une tête de mort pour la relancer, une fois dans le tour.',
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
