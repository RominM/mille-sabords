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
defineEmits<{ click: [] }>()

const canClick = computed(() => props.clickable && !props.die.locked && props.die.face !== null)
</script>

<template>
  <button
    class="die-view"
    :class="{
      'is-empty': die.face === null,
      'is-clickable': canClick,
      'is-selected': selected,
      'is-locked': die.locked,
      'is-banked': die.banked,
    }"
    :disabled="die.locked"
    type="button"
    :aria-label="die.face ?? 'dé vide'"
    @click="canClick && $emit('click')"
  >
    <img v-if="die.face" :src="FACE_IMG[die.face]" alt="" class="die-view__img" />
  </button>
</template>

<style scoped lang="scss">
.die-view {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  border-radius: 12%;
  transition: transform 0.12s ease;
}
.die-view__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12%;
}
.die-view.is-clickable {
  cursor: pointer;
}
.die-view.is-clickable:hover {
  transform: translateY(-6%) scale(1.04);
}
// États : liseré coloré autour de la tuile
.die-view.is-selected {
  outline: 0.4cqw solid var(--accent);
  outline-offset: -0.4cqw;
  box-shadow: 0 0 12px rgba(232, 196, 104, 0.6);
  border-radius: 12%;
}
.die-view.is-locked {
  outline: 0.35cqw solid var(--danger-edge);
  outline-offset: -0.35cqw;
  border-radius: 12%;
}
.die-view.is-banked {
  outline: 0.35cqw solid var(--success);
  outline-offset: -0.35cqw;
  border-radius: 12%;
}
</style>
