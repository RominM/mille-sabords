<script setup lang="ts">
// Écran de chargement : image + loader pendant le préchargement des assets.
import sealUrl from '~/assets/images/seal-btn.png'

withDefaults(
  defineProps<{
    loaded: number
    total: number
    progress: number
    image?: string
    title?: string
    hint?: string
  }>(),
  { title: 'Mille Sabords', hint: 'Chargement du trésor…' },
)
</script>

<template>
  <div class="app-loader">
    <div class="app-loader__inner">
      <img :src="image ?? sealUrl" alt="" class="app-loader__mark" />
      <h1 class="app-loader__title">{{ title }}</h1>
      <hr class="rope app-loader__rope" />
      <div class="app-loader__bar" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: progress + '%' }" />
      </div>
      <p class="app-loader__hint mono">{{ hint }} {{ progress }}%</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-loader {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background-color: var(--bg);
  background-image:
    radial-gradient(120% 90% at 50% 0%, rgba(74, 50, 34, 0.4) 0%, transparent 55%),
    radial-gradient(100% 100% at 50% 120%, var(--color-abyss-900) 0%, transparent 60%);
}
.app-loader__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  width: min(360px, 100%);
  text-align: center;
}
.app-loader__mark {
  width: 132px;
  height: 132px;
  object-fit: contain;
  filter: drop-shadow(0 8px 18px rgba(24, 14, 8, 0.7));
  animation: seal-pulse 1.6s ease-in-out infinite;
}
.app-loader__title {
  font-family: var(--font-display);
  font-size: var(--fs-display-l);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}
.app-loader__rope {
  width: 100%;
}
.app-loader__bar {
  width: 100%;
  height: 10px;
  border-radius: 6px;
  background: var(--surface);
  box-shadow: inset 0 2px 4px rgba(24, 14, 8, 0.6);
  overflow: hidden;
}
.app-loader__bar > span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--color-doubloon), var(--color-doubloon-hi));
  transition: width 0.25s ease;
}
.app-loader__hint {
  color: var(--text-dim);
  font-size: var(--fs-body-s);
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
