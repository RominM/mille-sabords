<template>
  <div class="board-dice">
    <div
      v-for="(die, index) in dice"
      :key="die.id"
      class="board-dice__cell"
      :class="{ 'board-dice__cell--held': heldDie === die.id, grabbable: clickable }"
      :style="scatterStyle(die.id)"
      @pointerdown="clickable && emit('grab', die.id, $event)"
    >
      <DieView
        :die="die"
        :clickable="clickable"
        :roll="roll"
        motion="roll"
        :travel="DICE_THROW.travel"
        :heading="headingFor(index, dice.length)"
        :delay="index * DICE_THROW.stagger"
        :duration="DICE_THROW.duration"
        :silent="index > 0"
        @click="emit('toggle', die.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Les dés encore en jeu, au centre du plateau.
 *
 * Ils ROULENT jusqu'à leur place, égrenés, puis une dispersion reproductible
 * les dérange : sans elle ils retomberaient au cordeau sur une grille, ce qui
 * trahirait l'animation.
 *
 * Le composant ne décide de rien — il ne sait ni ce qu'est un dé gardé ni quand
 * on peut cliquer. Il rend ce qu'on lui donne et signale les gestes.
 */
import type { PropType } from 'vue'
import type { Die } from '@rf/engine'

const props = defineProps({
  /** Dés à dessiner. Ceux SANS face restent de la partie, invisibles : leur
      composant doit exister avant le premier jet, sinon ce jet-là apparaîtrait
      tout posé au lieu de rouler. */
  dice: { type: Array as PropType<Die[]>, required: true },
  /** Compteur de jets : toute incrémentation relance l'animation. */
  roll: { type: Number, required: true },
  clickable: { type: Boolean, default: false },
  /** Dé actuellement saisi, pour creuser sa place. */
  heldDie: { type: Number as PropType<number | null>, default: null }
})

const emit = defineEmits<{ grab: [dieId: number, event: PointerEvent]; toggle: [dieId: number] }>()

/**
 * Où chaque dé s'immobilise, et comment il est tourné. `translate` et `rotate`
 * séparément, jamais `transform` : celui-ci aplatirait la scène 3D des cubes.
 */
function scatterStyle(dieId: number): Record<string, string> {
  const { x, y, angle } = scatterFor(dieId, props.roll)
  return { translate: `${x}% ${y}%`, rotate: `${angle}deg` }
}
</script>

<style scoped lang="scss">
.board-dice {
  position: absolute;
  left: 19%;
  top: 22%;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 1.4cqw;
  width: 55%;
  height: 42%;

  &__cell {
    --die-size: 4cqw;

    width: var(--die-size);
    height: var(--die-size);
    touch-action: none;

    &--held {
      opacity: 0.25;
    }
  }
}
</style>
