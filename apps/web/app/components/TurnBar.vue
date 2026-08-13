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
 * Un seul pour la table, et non un par carte joueur : le compte à rebours ne
 * concerne QUE le siège actif, et le répéter sur chaque carte laissait croire
 * que tout le monde était chronométré. En haut et pleine largeur, il se voit
 * sans qu'on ait à le chercher, et ne dispute sa place à rien.
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
  // Le bandeau borde le plateau : pas de coins arrondis, il en épouse le bord.
  pointer-events: none;

  // La jauge est ancrée à GAUCHE et rétrécit : son bord franchit le plateau de
  // la droite vers la gauche, ce qui donne le sens de lecture du temps qui
  // s'écoule.
  &__fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-doubloon), var(--color-doubloon-hi));
    box-shadow: 0 0 0.6cqh rgba(232, 196, 104, 0.55);
    // Le décompte tombe à la seconde : sans transition, la barre saute.
    transition:
      width 0.95s linear,
      background 0.3s ease;
  }

  &--low &__fill {
    background: linear-gradient(90deg, var(--color-wax), var(--color-wax-edge));
    box-shadow: 0 0 0.8cqh rgba(192, 82, 75, 0.7);
  }

  // Le chiffre reste, pour qui veut la seconde exacte — discret, posé sous la
  // jauge plutôt que dedans, où il serait illisible sur 1 % de hauteur.
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
