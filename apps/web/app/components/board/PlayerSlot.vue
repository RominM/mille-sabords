<template>
  <div class="pslot-row">
    <div
      v-if="player"
      class="pslot"
      :class="{ 'pslot--waiting': !current, 'pslot--current': current }"
    >
      <img :src="slotFrame" alt="" class="pslot__frame" />
      <img :src="avatarUrl" alt="" class="pslot__avatar" />
      <span class="pslot__name">{{ player.name }}</span>
      <span class="pslot__score" :class="scoreClass">{{ scoreText }}</span>
      <PlayerTimer
        v-if="current && seconds !== undefined"
        class="pslot__timer"
        :seconds="seconds"
        :total="totalSeconds ?? 60"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Player } from '@rf/engine'
import slotFrame from '~/assets/images/ui/gamer-slot.webp'
import botAvatar from '~/assets/images/character/chara_bot.webp'
import pirateAvatar from '~/assets/images/character/chara_pirate.webp'

const props = defineProps<{
  player: Player | null
  /** Portrait choisi par le joueur ; sinon on retombe sur celui de son camp. */
  avatar?: string
  current?: boolean
  seconds?: number
  totalSeconds?: number
}>()

const avatarUrl = computed(
  () => props.avatar ?? (props.player?.bot ? botAvatar : pirateAvatar)
)

const scoreText = computed(() => String(props.player?.score ?? 0))

/** Le score ne doit ni déborder ni être tronqué : on réduit la police si besoin. */
const scoreClass = computed(function pickScoreClass() {
  const n = scoreText.value.length
  if (n >= 6) return 'pslot__score--xs'
  if (n >= 5) return 'pslot__score--sm'
  return ''
})
</script>

<style scoped lang="scss">
.pslot-row {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pslot {
  position: relative;
  height: 113%; // déborde un peu le barreau pour le remplir visuellement
  aspect-ratio: 1024 / 411;
  max-width: 100%;
  overflow: hidden;
  container-type: size; // les enfants se dimensionnent en cqh/cqw
  transition: filter 0.2s ease;

  &__frame {
    position: absolute;
    top: -130.17%; // (535/1536) × hauteur
    left: 0;
    width: 100%;
    height: 373.72%; // 100 / (411/1536) → la bande remplit exactement la carte
    object-fit: fill;
    pointer-events: none;
  }

  &__avatar {
    position: absolute;
    top: 15%;
    left: 6.5%;
    width: 23%;
    height: 70%;
    border-radius: 50%;
    object-fit: cover;
    object-position: center top;
  }

  &__name {
    position: absolute;
    top: 29.3%;
    left: 37.5%;
    width: 31.5%;
    height: 22.2%;
    padding: 0 8cqh 0 12cqh;
    color: var(--color-parchment, #ede0c8);
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 14cqh;
    line-height: 22.2cqh; // = hauteur du champ → centrage vertical
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__score {
    position: absolute;
    top: 29.3%;
    left: 71.8%;
    width: 23.6%;
    height: 22.2%;
    padding: 0 1cqh;
    color: var(--color-doubloon, #c9a227);
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 15cqh;
    line-height: 22.2cqh;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    white-space: nowrap;
    overflow: hidden; // sécurité : les paliers ci-dessous évitent la troncature

    &--sm {
      font-size: 13cqh; // 5 caractères (ex. -1000)
    }

    &--xs {
      font-size: 11cqh; // 6 caractères
    }
  }

  &__timer {
    position: absolute;
    top: 58.7%;
    left: 39.5%;
    width: 58.8%;
    height: 13.7%;
  }

  &--waiting {
    filter: grayscale(0.7) brightness(0.55);
  }

  &--current {
    filter: drop-shadow(0 0 1.5cqh rgba(232, 196, 104, 0.5));
  }
}
</style>
