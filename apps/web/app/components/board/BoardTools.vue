<template>
  <div class="board-tools">
    <button
      v-click-sound
      v-hover-sound
      v-tooltip="'Règles du jeu'"
      class="board-tools__button"
      type="button"
      aria-label="Règles"
      @click="emit('rules')"
    >
      <img :src="rulesIcon" alt="" class="board-tools__icon" />
    </button>

    <button
      v-click-sound
      v-hover-sound
      v-tooltip="'Paramètres — son, et quitter la partie'"
      class="board-tools__button"
      type="button"
      aria-label="Paramètres"
      @click="emit('settings')"
    >
      <Cog class="board-tools__cog" :size="34" :stroke-width="1.75" />
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Les deux accès permanents du plateau : les règles, et les paramètres.
 *
 * Calés dans le creux entre le crâne et la lanterne de gauche — la seule zone
 * du décor qui ne porte ni dés, ni carte, ni joueurs.
 */
import { Cog } from 'lucide-vue-next'
import rulesIcon from '~/assets/images/ui/icon-rules.webp'

const emit = defineEmits<{ rules: []; settings: [] }>()
</script>

<style scoped lang="scss">
.board-tools {
  position: absolute;
  top: 2.5%;
  right: 13%;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 1cqw;

  &__button {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    transition: transform 0.12s ease;

    &:hover {
      transform: scale(1.06);
    }
  }

  &__icon {
    width: 5cqw;
    height: auto;
    filter: drop-shadow(0 2px 4px rgba(24, 14, 8, 0.8));
  }

  &__cog {
    color: var(--accent);
    filter: drop-shadow(0 2px 4px rgba(24, 14, 8, 0.8));
  }
}
</style>
