<template>
  <div class="app-loader">
    <div class="app-loader__frame">
      <img :src="titleUrl" :alt="title" class="app-loader__title" />

      <div
        class="app-loader__slot"
        role="progressbar"
        :aria-valuenow="progress ?? undefined"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="app-loader__fill"
          :class="{ 'app-loader__fill--sweep': progress === null }"
          :style="progress === null ? undefined : { width: `${progress}%` }"
        />
        <p class="app-loader__hint mono">{{ hint }}<span v-if="progress !== null"> {{ progress }}%</span></p>
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
 *
 * Deux usages : le préchargement des assets, qui SAIT où il en est et affiche
 * son pourcentage ; et les passages d'un écran à l'autre, qui ne mesurent rien —
 * `progress` vaut alors `null` et la jauge balaie sans mentir sur une avance.
 */
import titleUrl from '~/assets/images/main-title.webp'

withDefaults(
  defineProps<{
    /** `null` : chargement sans mesure, la jauge balaie. */
    progress?: number | null
    title?: string
    hint?: string
  }>(),
  { progress: null, title: 'Reckless Fathoms', hint: 'Chargement du trésor…' }
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

    // Sans mesure, la jauge ne reste pas figée à zéro : elle va et vient dans
    // sa rainure. Un balayage dit « ça travaille », un pourcentage inventé
    // dirait « j'en suis là » — ce serait faux.
    &--sweep {
      width: 34%;
      transition: none;
      animation: app-loader-sweep 1.3s ease-in-out infinite alternate;
    }
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

// La jauge fait 34 % de la rainure : 194 % de sa propre largeur l'amène
// exactement bord à bord, sans jamais en sortir.
@keyframes app-loader-sweep {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(194%);
  }
}
</style>
