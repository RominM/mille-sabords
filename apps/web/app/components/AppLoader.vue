<template>
  <div class="app-loader">
    <div class="app-loader__inner">
      <h1 class="app-loader__title">{{ title }}</h1>
      <hr class="rope app-loader__rope" />
      <div
        class="app-loader__bar"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="app-loader__fill" :style="{ width: progress + '%' }" />
      </div>
      <p class="app-loader__hint mono">{{ hint }} {{ progress }}%</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Écran de chargement : image + jauge pendant le préchargement des assets.
import sealUrl from '~/assets/images/ui/btn-seal.png'

withDefaults(
  defineProps<{
    loaded: number
    total: number
    progress: number
    image?: string
    title?: string
    hint?: string
  }>(),
  { title: 'Mille Sabords', hint: 'Chargement du trésor…' }
)
</script>

<style scoped lang="scss">
.app-loader {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background-color: var(--bg);
  background-image: url(./../assets/images/ui/app-loader.png);
  width: 100%;
  height: 100%;
  &__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    width: min(360px, 100%);
    text-align: center;
  }

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: var(--fs-display-l);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__rope {
    width: 100%;
  }

  &__bar {
    width: 100%;
    height: 10px;
    overflow: hidden;
    border-radius: 6px;
    background: var(--surface);
    box-shadow: inset 0 2px 4px rgba(24, 14, 8, 0.6);
  }

  &__fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--color-doubloon), var(--color-doubloon-hi));
    transition: width 0.25s ease;
  }

  &__hint {
    color: var(--text-dim);
    font-size: var(--fs-body-s);
  }
}

@keyframes seal-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-loader__mark {
    animation: none;
  }
}
</style>
