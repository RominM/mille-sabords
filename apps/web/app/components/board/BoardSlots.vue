<template>
  <div class="board-slots">
    <div
      v-for="index in SLOT_COUNT"
      :key="index"
      class="board-slots__cell"
      :class="{
        'board-slots__cell--target': hovered === index - 1,
        'board-slots__cell--held': heldDie !== null && heldDie === dice[index - 1]?.id,
        grabbable: clickable && !!dice[index - 1]
      }"
      :data-slot="index - 1"
      @pointerdown="dice[index - 1] && clickable && emit('grab', dice[index - 1]!.id, $event)"
    >
      <DieView
        v-if="dice[index - 1]"
        :die="dice[index - 1]!"
        :clickable="clickable"
        :rescuable="guardianOffered && dice[index - 1]!.face === 'skull'"
        :selected="dice[index - 1]!.id !== guardianDie"
        seated
        @click="emit('toggle', dice[index - 1]!.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Les huit emplacements où l'on range les dés gardés.
 *
 * `data-slot` est ce que le glisser-déposer cherche sous le pointeur : c'est
 * lui qui permet au joueur de choisir SA case et de regrouper ses dés, plutôt
 * que de les voir se tasser à gauche.
 */
import type { PropType } from 'vue'
import type { Die } from '@rf/engine'

defineProps({
  /** Un dé par emplacement, à SA place — `null` pour une case vide. */
  dice: { type: Array as PropType<(Die | null)[]>, required: true },
  clickable: { type: Boolean, default: false },
  /** La Gardienne peut reprendre une tête de mort, une fois dans le tour. */
  guardianOffered: { type: Boolean, default: false },
  /** Tête confiée à la Gardienne : elle se distingue des autres. */
  guardianDie: { type: Number as PropType<number | null>, default: null },
  /** Emplacement survolé pendant un glissé, pour l'éclairer avant le lâcher. */
  hovered: { type: Number as PropType<number | null>, default: null },
  heldDie: { type: Number as PropType<number | null>, default: null }
})

const emit = defineEmits<{ grab: [dieId: number, event: PointerEvent]; toggle: [dieId: number] }>()

/** Le moteur joue à huit dés ; la rangée est dessinée sur le décor. */
const SLOT_COUNT = 8
</script>

<style scoped lang="scss">
// Rangée mesurée sur le décor (1672×941) : cadres x 413..1242, y 652..748 ;
// un cadre fait 91 px, le pas est de 105,6. L'écart de 14,6 px se rapporte à la
// LARGEUR DE LA RANGÉE (829 px) et non au plateau — c'est ce que fait `gap` en
// pourcentage : 14,6 / 829 = 1,76 %.
.board-slots {
  position: absolute;
  left: 24.7%;
  top: 69.29%;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 1.76%;
  place-items: center;
  width: 49.58%;
  height: 10.2%;

  // Le dé est nettement plus petit que son cadre : le liseré doré du décor doit
  // rester visible tout autour, sinon le dé a l'air posé DEVANT son logement.
  &__cell {
    --die-size: 4.4cqw;

    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    touch-action: none;

    &--held {
      opacity: 0.25;
    }

    // Cadre visé : il s'allume avant le lâcher, sinon on dépose à l'aveugle.
    &--target::after {
      content: '';
      position: absolute;
      inset: -6%;
      border: 0.25cqw solid var(--accent-hi);
      border-radius: 10%;
      box-shadow: 0 0 1.2cqw rgba(232, 196, 104, 0.55);
      pointer-events: none;
    }
  }
}
</style>
