<template>
  <div>
    <NuxtPage />
    <AppLoader v-if="!ready" :loaded="loaded" :total="total" :progress="progress" />
    <!-- Accueil : plein écran puis « à propos », une fois le décor chargé. -->
    <StartupPrompts v-else />
  </div>
</template>

<script setup lang="ts">
// Précharge tous les assets AVANT de révéler le jeu, pour un affichage d'un bloc.
const { loaded, total, progress, ready, preload } = useAssetPreloader({ minDuration: 1400 })

onMounted(preload)

// Musique continue, choisie selon l'écran (lobby / partie) — jamais de silence.
useBackgroundMusic()
</script>
