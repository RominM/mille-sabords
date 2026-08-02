<template>
  <div>
    <NuxtPage />
    <!-- <audio autoplay controls loop :src="inGameRoute ? null : mainAmbiance" /> -->
    <AppLoader v-if="!ready" :loaded="loaded" :total="total" :progress="progress" />
  </div>
</template>

<script setup lang="ts">
import mainAmbiance from './assets/sounds/SoundsCrate-Dark_Waters.mp3'
import test from './assets/sounds/dobcommunications-busy-restaurant-dining-room-ambience-128466.mp3'
// Précharge tous les assets AVANT de révéler le jeu, pour un affichage d'un bloc.
const { loaded, total, progress, ready, preload } = useAssetPreloader({ minDuration: 1400 })

onMounted(preload)

const route = useRoute()

const inGameRoute = computed(() => route.fullPath === '/solo')
</script>
