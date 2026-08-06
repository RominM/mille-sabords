<template>
  <button
    v-click-sound="canClick"
    class="die-view"
    :class="{
      'die-view--empty': die.face === null,
      'die-view--clickable': canClick,
      'die-view--selected': selected,
      'die-view--locked': die.locked,
      'die-view--banked': die.banked,
      'die-view--rescuable': rescuable && die.locked
    }"
    :disabled="die.locked && !rescuable"
    type="button"
    :aria-label="die.face ?? 'dé vide'"
    @click="onClick"
  >
    <img v-if="die.face" :src="FACE_IMG[die.face]" alt="" class="die-view__img" />
  </button>
</template>

<script setup lang="ts">
import type { Die, DieFace } from '@rf/engine'
import sabre from '~/assets/images/dice/die-face_sabre.webp'
import skull from '~/assets/images/dice/die-face_skull.webp'
import monkey from '~/assets/images/dice/die-face_monkey.webp'
import parrot from '~/assets/images/dice/die-face_parot.webp'
import coin from '~/assets/images/dice/die-fice_coin.webp'
import diamond from '~/assets/images/dice/die-face_diamond.webp'

const FACE_IMG: Record<DieFace, string> = { sabre, skull, monkey, parrot, coin, diamond }

const props = defineProps<{
  die: Die
  clickable?: boolean
  selected?: boolean
  /** Tête de mort récupérable par la Gardienne : elle redevient cliquable. */
  rescuable?: boolean
}>()
const emit = defineEmits<{ click: [] }>()

/**
 * Un dé n'est cliquable que s'il est lancé et que la phase le permet. Une tête
 * de mort est maudite — sauf quand la Gardienne peut la reprendre, seul cas où
 * un dé verrouillé accepte le clic.
 */
const canClick = computed(
  () => props.clickable && props.die.face !== null && (!props.die.locked || !!props.rescuable)
)

function onClick(): void {
  if (canClick.value) emit('click')
}
</script>

<style scoped lang="scss">
.die-view {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 12%;
  background: none;
  cursor: not-allowed;
  transition: transform 0.12s ease;

  &__img {
    width: 100%;
    height: 100%;
    border-radius: 12%;
    object-fit: contain;
  }

  &--clickable {
    cursor: inherit;

    &:hover {
      transform: translateY(-6%) scale(1.04);
    }
  }

  // États : liseré coloré autour de la tuile
  &--selected {
    border-radius: 12%;
    outline: 0.4cqw solid var(--accent);
    outline-offset: -0.4cqw;
    box-shadow: 0 0 12px rgba(232, 196, 104, 0.6);
  }

  &--locked {
    border-radius: 12%;
    outline: 0.35cqw solid var(--danger-edge);
    outline-offset: -0.35cqw;
  }

  // Tête de mort que la Gardienne peut reprendre : elle doit se distinguer des
  // autres têtes, sinon le joueur ne devine pas qu'elle est encore jouable.
  &--rescuable {
    outline-color: var(--accent);
    cursor: pointer;
    animation: rescuable-pulse 1.4s ease-in-out infinite;
  }

  @keyframes rescuable-pulse {
    0%,
    100% {
      box-shadow: 0 0 0 rgba(232, 196, 104, 0);
    }
    50% {
      box-shadow: 0 0 14px rgba(232, 196, 104, 0.75);
    }
  }

  &--banked {
    border-radius: 12%;
    outline: 0.35cqw solid var(--success);
    outline-offset: -0.35cqw;
  }
}
</style>
