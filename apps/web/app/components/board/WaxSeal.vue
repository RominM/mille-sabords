<template>
  <button
    v-click-sound
    v-hover-sound
    class="wax"
    type="button"
    :aria-label="label"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <img :src="sealUrl" alt="" class="wax__img" />
  </button>
</template>

<script setup lang="ts">
/**
 * Bouton d'action principal : le cachet de cire.
 * C'est la signature visuelle du jeu — on le retrouve sur Jouer / Lancer /
 * S'arrêter / Rejouer. L'image est interchangeable via la prop `image`.
 */
import defaultSeal from '~/assets/images/ui/wax-seal-lancer.webp'

const props = defineProps<{ label: string; disabled?: boolean; image?: string }>()
defineEmits<{ click: [] }>()

const sealUrl = computed(() => props.image ?? defaultSeal)
</script>

<style scoped lang="scss">
.wax {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  transition: transform 0.08s ease;

  &:hover {
    transform: scale(1.03);
  }

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.45;
    filter: grayscale(0.6);
    cursor: not-allowed;
  }

  &:disabled:hover {
    transform: none;
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 6px 14px rgba(24, 14, 8, 0.6));
    pointer-events: none;
  }
}
</style>
