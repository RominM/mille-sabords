<template>
  <Teleport to="body">
    <div class="flash" :class="`flash--${sign}`" role="status" aria-live="polite">
      <p class="flash__actor">{{ actor }}</p>
      <p class="flash__score">{{ signed }} pts</p>
      <p v-if="why" class="flash__why">{{ why }}</p>
      <p v-if="outcome.opponentPenalty > 0" class="flash__penalty">
        Chaque adversaire perd {{ outcome.opponentPenalty }} points
      </p>
      <p v-if="outcome.breakdown?.instantWin" class="flash__magic">
        ⚡ Magie pirate — neuf symboles identiques !
      </p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Résultat d'un tour, en grand et par-dessus le plateau.
 *
 * Remplace la modale de récapitulatif : elle demandait un clic pour rien — le
 * tour est joué, il n'y a plus de décision à prendre — et masquait justement le
 * plateau qu'on veut relire pour comprendre ce qui vient d'arriver.
 *
 * D'où le fond transparent et l'absence de bouton. Le POURQUOI reste affiché,
 * lui : un zéro ne se lit pas de la même façon selon qu'on a fait trois têtes,
 * manqué un défi ou laissé filer le temps. Le détail chiffré, moins urgent,
 * s'est replié dans l'historique.
 */
import type { TurnOutcome } from '@rf/engine'

const props = defineProps<{ outcome: TurnOutcome; actor: string }>()

const signed = computed(() =>
  props.outcome.score >= 0 ? `+${props.outcome.score}` : `${props.outcome.score}`
)

const sign = computed(() => (props.outcome.score > 0 ? 'pos' : props.outcome.score < 0 ? 'neg' : 'zero'))

const why = computed(() => {
  if (props.outcome.reason === 'three-skulls') return 'Trois têtes de mort — tour perdu'
  if (props.outcome.reason === 'skull-island') return 'Île de la Tête-de-Mort'
  if (props.outcome.breakdown?.shipResult === 'failed') return 'Défi du Bateau Pirate manqué'
  if (props.outcome.breakdown?.fullChest) return 'Coffre au trésor plein'
  if (props.outcome.breakdown?.doubled) return 'Carte Pirate — points doublés'
  return ''
})
</script>

<style scoped lang="scss">
// Aucun voile : le plateau reste lisible derrière, c'est tout l'intérêt.
// `pointer-events: none` pour que le décor reste survolable pendant l'affichage.
.flash {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  pointer-events: none;
  text-align: center;
  animation: flash-in 0.35s ease-out both;

  &__actor {
    color: var(--text);
    font-family: var(--font-display);
    font-size: clamp(1.2rem, 3vw, 2rem);
    letter-spacing: 0.04em;
    // Sans halo, le texte se perd dans les zones claires du bois.
    text-shadow:
      0 0 0.6rem rgba(24, 14, 8, 0.95),
      0 2px 4px rgba(24, 14, 8, 1);
  }

  &__score {
    font-family: var(--font-display);
    font-size: clamp(4rem, 16vw, 12rem);
    line-height: 0.9;
    text-shadow:
      0 0 1.2rem rgba(24, 14, 8, 0.9),
      0 4px 10px rgba(24, 14, 8, 1);
  }

  // Vert et rouge lisibles sur bois sombre — ni le teal ni le rouge cire des
  // fonds, qui perdent leur contraste à cette taille.
  &--pos &__score {
    color: #6ee08a;
  }

  &--neg &__score {
    color: #ff7a6b;
  }

  &--zero &__score {
    color: var(--text-dim);
  }

  &__why,
  &__penalty,
  &__magic {
    color: var(--text);
    font-family: var(--font-body);
    font-size: clamp(0.9rem, 1.8vw, 1.3rem);
    text-shadow:
      0 0 0.6rem rgba(24, 14, 8, 0.95),
      0 2px 4px rgba(24, 14, 8, 1);
  }

  &__magic {
    color: var(--accent-hi);
    font-weight: 600;
  }

  @keyframes flash-in {
    from {
      opacity: 0;
      scale: 0.8;
    }
    to {
      opacity: 1;
      scale: 1;
    }
  }

  // Le mouvement n'apporte rien ici : l'information, si.
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}
</style>
