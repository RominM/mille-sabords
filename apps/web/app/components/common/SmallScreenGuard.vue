<template>
  <div class="small-screen-guard">
    <div class="small-screen-guard__card">
      <img :src="titleUrl" alt="Reckless Fathoms" class="small-screen-guard__title" />

      <p class="small-screen-guard__text">
        Le plateau ne tient pas sur un écran aussi étroit : les dés, les cadres
        et la carte deviennent illisibles bien avant d'être jouables.
      </p>

      <p class="small-screen-guard__text">
        Tourne l'appareil, élargis la fenêtre, ou reviens depuis un ordinateur —
        il faut <strong>740&nbsp;px</strong> de large au minimum.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Garde-fou des petits écrans.
 *
 * Tout en CSS, sans mesure en JavaScript : une requête de média suffit, et
 * elle suit le redimensionnement sans qu'on écoute quoi que ce soit. Le
 * garde-fou est TOUJOURS rendu, simplement masqué au-dessus du seuil.
 *
 * Le choix est assumé : plutôt qu'un plateau tassé et injouable, on dit
 * franchement que ce n'est pas le bon écran.
 */
import titleUrl from '~/assets/images/main-title.webp'
</script>

<style scoped lang="scss">
.small-screen-guard {
  display: none;

  // Au-dessus de TOUT — chargeur (1000), infobulle (200), modales (100) : sous
  // le seuil, plus rien de l'application ne doit rester atteignable.
  @media (max-width: 739.98px) {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: grid;
    place-items: center;
    padding: var(--space-4);
    background: var(--color-abyss-900);
    overflow-y: auto;
  }

  &__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    max-width: 34rem;
    text-align: center;
  }

  &__title {
    width: min(20rem, 80vw);
  }

  &__text {
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.05rem;
    line-height: 1.5;

    strong {
      color: var(--accent);
    }
  }
}
</style>
