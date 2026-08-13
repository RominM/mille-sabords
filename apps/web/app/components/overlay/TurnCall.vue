<template>
  <Teleport to="body">
    <div class="call" role="status" aria-live="polite">
      <p class="call__text">À toi de jouer</p>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Annonce du tour, en grand par-dessus le plateau.
 *
 * Même parti pris que le résultat de fin de tour : transparent, sans bouton,
 * effacé tout seul. En multijoueur, la main revient sans prévenir après le tour
 * des autres — et sur un plateau chargé, le liseré du portrait actif ne suffit
 * pas à rattraper un joueur qui regardait ailleurs.
 *
 * Volontairement plus court que le résultat : celui-ci s'explique, celle-là ne
 * fait que réveiller.
 */
</script>

<style scoped lang="scss">
.call {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  pointer-events: none;
  animation: call-in 0.3s ease-out both;

  &__text {
    color: var(--accent-hi);
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 9vw, 7rem);
    line-height: 1;
    letter-spacing: 0.04em;
    text-align: center;
    text-shadow:
      0 0 1.2rem rgba(24, 14, 8, 0.95),
      0 4px 10px rgba(24, 14, 8, 1);
  }

  @keyframes call-in {
    from {
      opacity: 0;
      scale: 0.85;
    }
    to {
      opacity: 1;
      scale: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}
</style>
