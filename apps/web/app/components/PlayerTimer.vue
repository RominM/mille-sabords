<script setup lang="ts">
/**
 * Timer du joueur — s'intègre dans la barre basse de la carte joueur.
 * Purement présentationnel : il affiche le temps restant qu'on lui passe.
 * (L'application de la règle de timeout se fera côté moteur, plus tard.)
 */
const props = withDefaults(defineProps<{ seconds: number; total?: number }>(), { total: 60 })

const ratio = computed(() => Math.max(0, Math.min(1, props.seconds / props.total)))
const low = computed(() => props.seconds <= 10)
</script>

<template>
  <div class="ptimer" :class="{ 'is-low': low }" role="timer" :aria-label="`${Math.ceil(seconds)} secondes restantes`">
    <div class="ptimer__fill" :style="{ width: ratio * 100 + '%' }" />
    <span class="ptimer__txt">{{ Math.ceil(seconds) }}s</span>
  </div>
</template>

<style scoped lang="scss">
// Les unités cqh se réfèrent à la carte joueur (.pslot, container-type: size)
.ptimer {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2cqh;
  background: rgba(24, 14, 8, 0.55);
}
.ptimer__fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #8a6f1c, var(--color-doubloon, #c9a227));
  transition: width 0.9s linear;
}
.ptimer.is-low .ptimer__fill {
  background: linear-gradient(90deg, #6d1f1f, var(--danger-edge, #c0524b));
}
.ptimer__txt {
  position: relative;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 9cqh;
  line-height: 1;
  color: var(--color-parchment, #ede0c8);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
}

@media (prefers-reduced-motion: reduce) {
  .ptimer__fill {
    transition: none;
  }
}
</style>
