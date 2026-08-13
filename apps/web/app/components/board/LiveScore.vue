<template>
  <div class="live" :class="`live--${sign}`">
    <span class="live__label">Si tu t’arrêtes</span>
    <span class="live__value">{{ signed }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Points en jeu à l'instant T : ce que le joueur emporterait s'il s'arrêtait.
 *
 * Le composant ne calcule rien — la valeur vient du moteur, qui simule un arrêt.
 * C'est ce qui la rend juste même quand elle tombe à zéro sur une 3e tête, ou
 * qu'elle passe en négatif sur un défi de bateau manqué.
 */
const props = defineProps<{ score: number }>()

const signed = computed(() => (props.score >= 0 ? `+${props.score}` : `${props.score}`))
const sign = computed(() => (props.score > 0 ? 'pos' : props.score < 0 ? 'neg' : 'zero'))
</script>

<style scoped lang="scss">
.live {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2cqh;
  padding: 0.4cqh 1cqw;
  border: 1px solid var(--accent);
  border-radius: 0.4cqw;
  background: rgba(24, 14, 8, 0.78);
  text-align: center;

  &__label {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 1cqw;
    line-height: 1;
  }

  &__value {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 2cqw;
    line-height: 1;
  }

  // Le zéro reste neutre : à ce stade du tour, il n'annonce pas une perte.
  &--zero &__value {
    color: var(--text-dim);
  }

  &--pos &__value {
    color: var(--accent);
  }

  &--neg {
    border-color: var(--danger-edge);
  }

  &--neg &__value {
    color: var(--danger-edge);
  }
}
</style>
