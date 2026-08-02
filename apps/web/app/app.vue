<template>
  <div>
    <NuxtPage />
    <AppLoader v-if="!ready" :loaded="loaded" :total="total" :progress="progress" />
  </div>
</template>

<script setup lang="ts">
// Précharge tous les assets AVANT de révéler le jeu, pour un affichage d'un bloc.
const { loaded, total, progress, ready, preload } = useAssetPreloader({ minDuration: 1400 })

onMounted(preload)
</script>
