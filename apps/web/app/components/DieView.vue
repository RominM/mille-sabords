<template>
  <button
    class="die-view"
    :class="{
      'die-view--empty': die.face === null,
      'die-view--clickable': canClick,
      'die-view--selected': selected,
      'die-view--locked': die.locked,
      'die-view--banked': die.banked
    }"
    :disabled="die.locked"
    type="button"
    :aria-label="die.face ?? 'dé vide'"
    @click="onClick"
  >
    <img v-if="die.face" :src="FACE_IMG[die.face]" alt="" class="die-view__img" />
  </button>
</template>

<script setup lang="ts">
import type { Die, DieFace } from '@ms/engine'
import sabre from '~/assets/images/dice/die-face_sabre.png'
import skull from '~/assets/images/dice/die-face_skull.png'
import monkey from '~/assets/images/dice/die-face_monkey.png'
import parrot from '~/assets/images/dice/die-face_parot.png'
import coin from '~/assets/images/dice/die-fice_coin.png'
import diamond from '~/assets/images/dice/die-face_diamond.png'

const FACE_IMG: Record<DieFace, string> = { sabre, skull, monkey, parrot, coin, diamond }

const props = defineProps<{ die: Die; clickable?: boolean; selected?: boolean }>()
const emit = defineEmits<{ click: [] }>()

/** Un dé n'est cliquable que s'il est lancé, non verrouillé, et la phase le permet. */
const canClick = computed(() => props.clickable && !props.die.locked && props.die.face !== null)

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

  &--banked {
    border-radius: 12%;
    outline: 0.35cqw solid var(--success);
    outline-offset: -0.35cqw;
  }
}
</style>
