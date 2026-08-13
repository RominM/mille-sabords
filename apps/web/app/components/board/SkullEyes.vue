<template>
  <div class="skull-eyes" aria-hidden="true">
    <!-- Reprend exactement la géométrie du plateau pour rester aligné au décor -->
    <div class="skull-eyes__frame">
      <span class="skull-eyes__eye skull-eyes__eye--left" />
      <span class="skull-eyes__eye skull-eyes__eye--right" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Les yeux du crâne gravé en haut du plateau s'embrasent lors d'une défaite.
 * Purement décoratif (aria-hidden, pointer-events: none) : le composant se
 * superpose au plateau sans jamais intercepter de clic.
 *
 * Les positions sont mesurées sur `layout-game.webp` (1672 × 941) :
 * œil gauche 48,6 % / droit 51,2 % en x, 7,1 % en y.
 */
</script>

<style scoped lang="scss">
.skull-eyes {
  position: fixed;
  inset: 0;
  z-index: 1; // au-dessus des overlays de fin de tour
  display: grid;
  place-items: center;
  pointer-events: none;

  // Même calcul que .game__board → les yeux tombent pile sur le crâne
  &__frame {
    position: relative;
    width: min(100dvw, calc(100dvh * 1672 / 941));
    max-width: 100dvw;
    max-height: 100dvh;
    aspect-ratio: 1672 / 941;
    container-type: size;
  }

  // Deux petits points lumineux : un cœur blanc-rouge et un halo, pas
  // l'orbite entière. `screen` fait lire le tout comme de la lumière.
  &__eye {
    position: absolute;
    top: 8.5%;
    width: 1.5cqw;
    height: 1.5cqw;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 240, 230, 0.95) 0%,
      rgba(255, 70, 45, 0.9) 25%,
      rgba(205, 25, 10, 0.5) 50%,
      transparent 72%
    );
    box-shadow:
      0 0 1.1cqw 0.25cqw rgba(255, 45, 25, 0.8),
      0 0 3cqw 0.9cqw rgba(170, 15, 0, 0.55);
    mix-blend-mode: screen;
    animation: eye-pulse 1.15s ease-in-out infinite;

    &--left {
      left: 49.2%;
    }

    &--right {
      left: 51.7%;
      animation-delay: 0.08s; // léger décalage : le regard « respire »
    }
  }
}

@keyframes eye-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: translate(-50%, -50%) scale(0.85);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.15);
  }
}

// Mouvement réduit : la lueur reste, mais fixe
@media (prefers-reduced-motion: reduce) {
  .skull-eyes__eye {
    animation: none;
    opacity: 0.9;
  }
}
</style>
