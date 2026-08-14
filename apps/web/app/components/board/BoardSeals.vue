<template>
  <div class="board-seals">
    <div class="board-seals__roll">
      <WaxSeal label="Lancer" :disabled="!canRoll" @click="emit('roll')" />
    </div>

    <div class="board-seals__stop">
      <WaxSeal label="S’arrêter" :image="stopSeal" :disabled="!canStop" @click="emit('stop')" />
    </div>

    <!-- <span v-if="botThinking" class="board-seals__bot">Le Corsaire réfléchit…</span> -->
  </div>
</template>

<script setup lang="ts">
/**
 * Les deux cachets de cire : lancer, ou s'arrêter.
 *
 * Ils restent TOUJOURS affichés, simplement grisés quand l'action est
 * impossible — un bouton qui disparaît fait douter le joueur de l'avoir vu.
 *
 * Chacun se place dans l'angle formé par la rangée d'emplacements et la carte :
 * « Lancer » borde ce coin par le haut, « S'arrêter » par le bas.
 */
import stopSeal from '~/assets/images/ui/wax-seal-stop.webp'

defineProps({
  canRoll: { type: Boolean, default: false },
  canStop: { type: Boolean, default: false },
  /** Tour de l'IA : on annonce l'attente plutôt que de laisser l'écran figé. */
  botThinking: { type: Boolean, default: false }
})

const emit = defineEmits<{ roll: []; stop: [] }>()
</script>

<style scoped lang="scss">
.board-seals {
  position: absolute;
  inset: 0;
  pointer-events: none;

  // Les deux cachets se centrent sur le coin où la rangée d'emplacements
  // (droite : 74,3 %) rencontre la carte (gauche : 78 %) : « Lancer » au-dessus
  // de la rangée, « S'arrêter » en dessous. Centrés et non ancrés par un bord,
  // pour qu'ils tiennent dans ce couloir sans mordre ni l'une ni l'autre.
  &__roll,
  &__stop {
    position: absolute;
    translate: -50% -50%;

    :deep(.wax) {
      width: 100%;
      height: 100%;
      pointer-events: auto;
    }
  }

  // Dans le couloir entre la rangée d'emplacements (droite : 74,3 %) et la
  // carte (gauche : 78 %), au-dessus de la rangée.
  &__roll {
    left: 72.2%;
    top: 60%;
    width: 10cqw;
    height: 10cqw;
  }

  // À l'OPPOSÉ de « Lancer » : même colonne, même taille, de l'autre côté de
  // la rangée d'emplacements. Les deux gestes du tour se répondent, et celui
  // qui met fin au tour ne se cherche pas dans un coin sombre.
  &__stop {
    left: 80.2%;
    top: 71%;
    width: 9.4cqw;
    height: 9.4cqw;
  }

  &__bot {
    position: absolute;
    left: 68%;
    top: 71%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--accent);
    font-family: var(--font-body);
    font-size: 1.6cqw;
    text-shadow: 0 1px 3px rgba(24, 14, 8, 0.9);

    &::before {
      content: '🤖';
    }
  }
}
</style>
