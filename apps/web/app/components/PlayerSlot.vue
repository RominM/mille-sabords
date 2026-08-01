<script setup lang="ts">
import type { Player } from '@ms/engine'
import slotImg from '~/assets/images/ui/gamer-slot.png'
import botAvatar from '~/assets/images/character/chara_bot.png'
import pirateAvatar from '~/assets/images/character/chara_pirate.png'

const props = defineProps<{ player: Player | null; current?: boolean }>()

const avatar = computed(() => (props.player?.bot ? botAvatar : pirateAvatar))
</script>

<template>
  <div
    class="pslot"
    :class="{ 'pslot--empty': !player, 'pslot--waiting': player && !current, 'pslot--current': current }"
    :style="player ? { backgroundImage: `url(${slotImg})` } : undefined"
  >
    <template v-if="player">
      <img :src="avatar" alt="" class="pslot__avatar" />
      <div class="pslot__body">
        <div class="pslot__name">
          {{ player.name }}
          <span v-if="player.bot" class="pslot__tag">IA</span>
        </div>
        <div class="pslot__score">{{ player.score }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.pslot {
  position: relative;
  width: 100%;
  height: 100%;
  container-type: size;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: filter 0.2s ease;
}
// Slot vide : on laisse voir le cadre déjà dessiné sur le plateau.
.pslot--empty {
  background: none;
}
// Joueurs en attente : couleur ternie (filtre).
.pslot--waiting {
  filter: grayscale(0.65) brightness(0.55);
}
.pslot--current {
  filter: drop-shadow(0 0 8px rgba(232, 196, 104, 0.45));
}

// Avatar dans le cercle (à gauche du cadre gamer-slot).
.pslot__avatar {
  position: absolute;
  left: 6.5%;
  top: 15%;
  width: 23%;
  height: 70%;
  border-radius: 50%;
  object-fit: cover;
  object-position: center top;
}

// Contenu (nom + score) posé sur la partie droite du cadre (avatar à gauche).
.pslot__body {
  position: absolute;
  left: 34%;
  right: 5%;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4cqh;
}
.pslot__name {
  display: flex;
  align-items: center;
  gap: 4cqw;
  font-family: var(--font-body);
  font-weight: 600;
  color: var(--parchment, #ede0c8);
  font-size: 20cqh;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pslot__tag {
  font-family: var(--font-mono);
  font-size: 13cqh;
  color: var(--text-dim);
}
.pslot__score {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  font-size: 30cqh;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}
</style>
