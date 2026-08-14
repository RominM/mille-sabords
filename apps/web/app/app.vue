<template>
  <div>
    <NuxtPage />
    <AppLoader v-if="!ready" :progress="progress" />
    <StartupPrompts v-else />

    <!-- Au-dessus des routes, pour couvrir le passage d'un écran à l'autre :
         posé dans la page d'arrivée, il n'apparaîtrait qu'une fois celle-ci
         chargée — c'est-à-dire trop tard. -->
    <AppLoader v-if="ready && boarding" :progress="null" :hint="hint" />

    <SmallScreenGuard />
  </div>
</template>

<script setup lang="ts">
// Précharge tous les assets AVANT de révéler le jeu, pour un affichage d'un bloc.
const { progress, ready, preload } = useAssetPreloader({ minDuration: 1400 })
const { boarding, hint } = useBoarding()

onMounted(preload)

// Musique continue, choisie selon l'écran (lobby / partie) — jamais de silence.
useBackgroundMusic()
</script>
