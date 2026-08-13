<template>
  <div
    :class="['gamer-slot', { '--current': current }]"
    :style="{ backgroundImage: `url(${gamerLayout})`, width: size }"
  >
    <div class="gamer-slot__content" :style="{ maxWidth: size }">
      <img class="gamer-slot__content__avatar" :src="avatarUrl" alt="avatar pirate" />
      <p class="gamer-slot__content__name">{{ player?.name }}</p>
      <p class="gamer-slot__content__score">{{ player?.score }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '@rf/engine'
import gamerLayout from '~/assets/images/ui/gamer-slot.png'
import botAvatar from '~/assets/images/character/chara_bot.webp'
import pirateAvatar from '~/assets/images/character/chara_pirate.webp'

const props = defineProps({
  size: { type: String, default: '140px' },
  player: { type: Object as PropType<Player | null>, required: true },
  avatar: { type: String, default: '' },
  current: { type: Boolean, default: false }
})

const avatarUrl = computed(() => props.avatar ?? (props.player?.bot ? botAvatar : pirateAvatar))
</script>

<style scoped lang="scss">
.gamer-slot {
  position: relative;
  aspect-ratio: 14 / 11;
  container-type: inline-size;

  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;

  &__content {
    position: absolute;
    inset: 0;
    &__avatar {
      position: absolute;
      top: 1%;
      left: 50%;

      width: 29%;
      aspect-ratio: 1;

      transform: translateX(-50%);

      border-radius: 50%;
      object-fit: cover;
      overflow: hidden;
    }

    &__name {
      position: absolute;
      top: 57%;
      left: 10%;

      width: 80%;
      margin: 0;

      transform: translateY(-50%);

      color: var(--color-parchment, #ede0c8);
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 7cqw;
      line-height: 1;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__score {
      position: absolute;
      top: 76%;
      left: 10%;

      width: 80%;
      margin: 0;

      transform: translateY(-50%);

      color: var(--color-doubloon, #c9a227);
      font-family: var(--font-mono);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      font-size: 9cqw;
      line-height: 1;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);

      white-space: nowrap;
      overflow: hidden;
    }
  }

  &:not(.--current) {
    filter: grayscale(75%);
  }

  &.--current {
    filter: drop-shadow(0 0 10px #e8c468bf);
  }
}
</style>
