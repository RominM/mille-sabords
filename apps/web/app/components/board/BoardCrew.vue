<template>
  <div class="board-crew">
    <div v-for="(player, index) in players" :key="player.id" class="board-crew__seat">
      <GamerSlot
        size="100%"
        :player="player"
        :avatar="avatars[player.id]"
        :current="index === currentIndex"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * L'équipage, en bandeau au bord bas du plateau.
 *
 * Il défile en LARGEUR et non en hauteur : la table monte à huit, et une rangée
 * qui déborde vaut mieux qu'une colonne qui grimpe sur les emplacements de dés.
 *
 * Les portraits arrivent DÉJÀ résolus, en table indexée par joueur. Passer la
 * fonction qui les cherche obligerait ce composant à connaître d'où ils
 * viennent — de la table locale en solo, du serveur en multi.
 */
import type { PropType } from 'vue'
import type { Player } from '@rf/engine'

defineProps({
  players: { type: Array as PropType<Player[]>, required: true },
  /** Portrait de chaque joueur, par identifiant. */
  avatars: { type: Object as PropType<Record<string, string | undefined>>, required: true },
  /** Siège actif, à mettre en avant. `-1` quand la partie ne tourne pas. */
  currentIndex: { type: Number, default: -1 }
})
</script>

<style scoped lang="scss">
.board-crew {
  position: absolute;
  left: 0;
  bottom: 0.8%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.8cqw;
  width: 100%;
  padding: 0 1cqw;
  overflow-x: auto;
  // La barre de défilement mangerait la hauteur utile d'une carte.
  scrollbar-width: none;

  &__seat {
    flex: 0 1 12cqw;
    min-width: 8cqw;
    max-width: 12cqw;
  }
}
</style>
