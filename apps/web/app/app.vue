<template>
  <div>
    <NuxtPage />
    <AppLoader v-if="!ready" :progress="progress" />
    <StartupPrompts v-else />

    <SmallScreenGuard />
  </div>
</template>

<script setup lang="ts">
// Précharge tous les assets AVANT de révéler le jeu, pour un affichage d'un bloc.
const { progress, ready, preload } = useAssetPreloader({ minDuration: 1400 })

onMounted(preload)

// Musique continue, choisie selon l'écran (lobby / partie) — jamais de silence.
useBackgroundMusic()
</script>
