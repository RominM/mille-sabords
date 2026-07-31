<script setup lang="ts">
import type { Die, DieFace } from '@ms/engine'

const FACE: Record<DieFace, string> = {
  sabre: '⚔️',
  skull: '💀',
  monkey: '🐵',
  parrot: '🦜',
  coin: '🪙',
  diamond: '💎',
}

const props = defineProps<{ die: Die; clickable?: boolean; selected?: boolean }>()
defineEmits<{ click: [] }>()

const glyph = computed(() => (props.die.face ? FACE[props.die.face] : '·'))
</script>

<template>
  <button
    class="die"
    :class="{
      'die--skull': die.face === 'skull',
      'die--locked': die.locked,
      'die--banked': die.banked,
      'is-selected': selected,
      'is-clickable': clickable && !die.locked && die.face !== null,
    }"
    :disabled="die.locked"
    type="button"
    @click="clickable && !die.locked && die.face !== null && $emit('click')"
  >
    {{ glyph }}
  </button>
</template>

<style scoped lang="scss">
// .die est stylé globalement (design system) ; on n'ajoute que l'interaction.
.die.is-clickable {
  cursor: pointer;
}
.die.is-clickable:hover {
  transform: translateY(-2px);
}
.die.is-selected {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
</style>
