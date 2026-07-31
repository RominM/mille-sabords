<script setup lang="ts">
// Précharge tous les assets AVANT de révéler le jeu, pour un affichage d'un bloc.
const { loaded, total, progress, ready, preload } = useAssetPreloader({ minDuration: 1400 })
onMounted(preload)
</script>

<template>
  <div>
    <NuxtPage />
    <Transition name="loader">
      <AppLoader v-if="!ready" :loaded="loaded" :total="total" :progress="progress" />
    </Transition>
  </div>
</template>

<style>
/* Fondu de sortie de l'écran de chargement (transition d'opacité uniquement,
   compatible prefers-reduced-motion). */
.loader-leave-active {
  transition: opacity 0.5s ease;
}
.loader-leave-to {
  opacity: 0;
}
</style>
