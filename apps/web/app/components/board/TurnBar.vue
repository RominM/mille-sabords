<template>
  <div
    class="turnbar"
    :class="{ 'turnbar--low': isLow }"
    role="timer"
    :aria-label="`${Math.ceil(seconds)} secondes pour décider`"
  >
    <div class="turnbar__fill" :style="{ width: `${ratio * 100}%` }" />
    <span class="turnbar__count">{{ Math.ceil(seconds) }}s</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Minuteur de décision, en bandeau sur toute la largeur du plateau.
 *
 * Un seul pour la table : le compte à rebours ne concerne QUE le siège actif.
 *
 * Il ne mesure rien : la valeur vient du moteur en solo, du serveur en multi.
 */
const props = withDefaults(defineProps<{ seconds: number; total?: number }>(), { total: 30 })

const ratio = computed(() => Math.max(0, Math.min(1, props.seconds / props.total)))
/** Les dix dernières secondes changent de couleur — on ne lit plus un chiffre. */
const isLow = computed(() => props.seconds <= 10)
</script>

<style scoped lang="scss">
.turnbar {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 6; // au-dessus de l'ambiance de l'île, sous les modales
  width: 100%;
  height: 1.1cqh;
  background: rgba(24, 14, 8, 0.55);
  pointer-events: none;

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-doubloon), var(--color-doubloon-hi));
    box-shadow: 0 0 0.6cqh rgba(232, 196, 104, 0.55);
    transition:
      width 0.95s linear,
      background 0.3s ease;
  }

  &--low &__fill {
    background: linear-gradient(90deg, var(--color-wax), var(--color-wax-edge));
    box-shadow: 0 0 0.8cqh rgba(192, 82, 75, 0.7);
  }

  &__count {
    position: absolute;
    right: 0.8cqw;
    top: 1.4cqh;
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 1.4cqh;
    line-height: 1;
    text-shadow: 0 1px 3px rgba(24, 14, 8, 0.95);
  }

  &--low &__count {
    color: var(--danger-edge);
  }
}
</style>
