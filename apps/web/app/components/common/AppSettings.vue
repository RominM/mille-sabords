<template>
  <div class="app-settings">
    <DisplaySettings />
    <SoundSettings />
  </div>
</template>

<script setup lang="ts">
/**
 * Tous les réglages du jeu, au même endroit et dans le même ordre — l'accueil
 * et la partie en cours montrent EXACTEMENT la même chose. Sans ce regroupement,
 * un réglage ajouté d'un côté manquerait de l'autre.
 */
</script>

<style scoped lang="scss">
.app-settings {
  // Les deux hôtes (le panneau de l'accueil, le parchemin de la partie) ont une
  // hauteur fixe : les réglages portent leur propre défilement.
  height: 100%;
  overflow-y: auto;

  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
