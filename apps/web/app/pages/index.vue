<template>
  <main class="home">
    <div class="home__panel panel">
      <h1 class="home__title">Mille Sabords</h1>
      <p class="home__tagline">
        Huit dés, une carte, et l'appât du gain. Arrête-toi à temps — la troisième
        tête de mort emporte tout.
      </p>

      <hr class="rope home__rope" />

      <nav class="home__menu">
        <NuxtLink to="/solo" class="btn home__link">Jouer en solo</NuxtLink>
        <NuxtLink to="/lobby" class="btn btn--ghost home__link">Multijoueur</NuxtLink>
        <button class="btn btn--ghost home__link" type="button" @click="toggleRules">
          {{ showRules ? 'Masquer les règles' : 'Les règles' }}
        </button>
      </nav>

      <section v-if="showRules" class="home__rules">
        <ul class="home__rules-list">
          <li v-for="rule in RULES" :key="rule">{{ rule }}</li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { WINNING_SCORE } from '@ms/engine'

const RULES: string[] = [
  `Le premier à ${WINNING_SCORE} points déclenche le dernier tour — le meilleur score l'emporte.`,
  'Trois têtes de mort et le tour est perdu : les têtes sont maudites, impossible de les relancer.',
  'Une relance se fait avec au moins deux dés ; garde ceux qui rapportent.',
  'Trois symboles identiques ou plus rapportent des points (100 pour 3, jusqu’à 4000 pour 8).',
  'Chaque pièce d’or et chaque diamant valent 100 points de plus.',
  'Les 8 dés sur la même valeur : coffre au trésor plein, +500 points.',
  'Quatre têtes de mort au premier lancer, et te voilà sur l’Île de la Tête-de-Mort : tes adversaires trinquent.'
]

const showRules = ref(false)

function toggleRules(): void {
  showRules.value = !showRules.value
}
</script>

<style scoped lang="scss">
.home {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: var(--space-4);

  &__panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    width: min(560px, 100%);
    text-align: center;
  }

  &__title {
    color: var(--accent);
    font-size: var(--fs-display-xl);
  }

  &__tagline {
    max-width: 46ch;
    color: var(--text-dim);
  }

  &__rope {
    width: 100%;
  }

  &__menu {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
  }

  &__link {
    min-width: 12rem;
    justify-content: center;
  }

  &__rules {
    width: 100%;
    text-align: left;
  }

  &__rules-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-size: var(--fs-body-s);
  }
}
</style>
