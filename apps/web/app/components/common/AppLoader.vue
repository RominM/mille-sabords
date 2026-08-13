<template>
  <div class="app-loader">
    <!-- Cadre au ratio exact de l'image : centré, jamais déformé ni rogné -->
    <div class="app-loader__frame">
      <img :src="titleUrl" :alt="title" class="app-loader__title" />

      <!-- La jauge occupe le cadre ouvragé dessiné en bas de l'illustration -->
      <div
        class="app-loader__slot"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="app-loader__fill" :style="{ width: progress + '%' }" />
        <p class="app-loader__hint mono">{{ hint }} {{ progress }}%</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Écran de chargement.
 *
 * L'illustration (1536 × 1024) est centrée et conserve son ratio : on la fait
 * RENTRER dans la fenêtre plutôt que de l'étirer, exactement comme le plateau.
 * Les éléments sont posés en % de ce cadre, donc ils restent alignés au décor
 * quelle que soit la taille de l'écran.
 */
import titleUrl from '~/assets/images/main-title.webp'

withDefaults(
  defineProps<{
    loaded: number
    total: number
    progress: number
    title?: string
    hint?: string
  }>(),
  { title: 'Reckless Fathoms', hint: 'Chargement du trésor…' }
)
</script>

<style scoped lang="scss">
.app-loader {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--color-abyss-900, #180e08);
  container-type: size; // référence des cq* ci-dessous

  // Ratio réel de l'illustration : 1536 × 1024 (3/2).
  // On se cale sur la boîte du loader (cqw/cqh) et non sur dvw/dvh : ces
  // dernières ignorent la barre de défilement et feraient déborder le cadre.
  &__frame {
    position: relative;
    width: min(100cqw, calc(100cqh * 1536 / 1024));
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1536 / 1024;
    background-image: url('~/assets/images/ui/app-loader.webp');
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
    container-type: size; // les enfants se dimensionnent en cqw/cqh
  }

  &__title {
    position: absolute;
    top: 31%;
    left: 50%;
    width: 46%;
    transform: translate(-50%, -50%);
    object-fit: contain;
    filter: drop-shadow(0 1.2cqh 2cqh rgba(0, 0, 0, 0.75));
  }

  // Intérieur du cadre ouvragé, mesuré sur l'illustration
  &__slot {
    position: absolute;
    top: 81.4%;
    left: 23.2%;
    width: 53%;
    height: 8.4%;
    display: flex;
    align-items: center;
    overflow: hidden;
    border-radius: 1cqh;
  }

  &__fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--color-doubloon), var(--color-doubloon-hi));
    box-shadow: 0 0 1.5cqh rgba(232, 196, 104, 0.55);
    transition: width 0.25s ease;
  }

  &__hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--color-parchment, #ede0c8);
    font-size: 2.6cqh;
    letter-spacing: 0.04em;
    white-space: nowrap;
    text-shadow: 0 0.2cqh 0.4cqh rgba(0, 0, 0, 0.9);
  }
}
</style>
