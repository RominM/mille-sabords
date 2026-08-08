<template>
  <div class="island" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * Ambiance de l'Île de la Tête-de-Mort.
 *
 * La phase la plus dangereuse du jeu ne se distinguait par rien : mêmes
 * couleurs, même plateau. Le joueur y arrive sans le sentir. On change donc la
 * LUMIÈRE de la scène plutôt que d'ajouter un panneau qui dirait « attention ».
 *
 * `backdrop-filter` et non `filter` : un filtre posé sur un ANCÊTRE des dés
 * aplatirait leur scène 3D (cf. le piège n° 8 de CLAUDE.md). Ici on retouche ce
 * qui est DÉJÀ dessiné derrière — le décor, les dés, la carte gardent leur
 * image, seule leur teinte change.
 *
 * Se pose dans son parent positionné — le plateau — et non sur la fenêtre : la
 * scène est le plateau, et le composant devient ainsi montable tel quel dans la
 * maquette du labo pour y être réglé.
 *
 * Rien n'est interactif : `pointer-events: none`, le plateau reste entièrement
 * jouable pendant que l'ambiance tourne.
 */
</script>

<style scoped lang="scss">
// Les trois nombres de l'ambiance, réunis pour être retouchés d'un coup d'œil.
// Ils se règlent à l'œil dans le labo (`/lab`).
.island {
  --island-hue: 0;
  --island-saturation: 2.25;
  --island-brightness: 0.48;

  position: absolute;
  inset: 0;
  z-index: 5; // au-dessus des dés et de la carte, sous les cachets d'action
  pointer-events: none;
  backdrop-filter: hue-rotate(var(--island-hue)) saturate(var(--island-saturation))
    brightness(var(--island-brightness));
  // La bascule doit se sentir sans arracher l'œil : le décor chauffe, il ne
  // clignote pas.
  animation: island-in 0.6s ease-out both;
}

// On n'anime QUE l'opacité. Mettre `backdrop-filter` dans l'image de départ le
// fait interpoler depuis le filtre identité — et il y reste, neutralisé : le
// décor ne changeait pas de teinte d'un iota. L'opacité suffit d'ailleurs à
// faire monter l'effet, puisqu'elle dose le mélange avec le fond.
@keyframes island-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

// Le mouvement n'apporte rien ici, la teinte porte toute l'information.
@media (prefers-reduced-motion: reduce) {
  .island {
    animation: none;
  }
}
</style>
