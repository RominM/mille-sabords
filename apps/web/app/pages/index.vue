<template>
  <main class="home">
    <div class="home__panel panel">
      <h1 class="home__title">Reckless Fathoms</h1>
      <p class="home__tagline">
        Huit dés, une carte, et l'appât du gain. Arrête-toi à temps — la troisième tête de mort emporte tout.
      </p>

      <hr class="rope home__rope" />
      <nav class="home__menu">
        <NuxtLink v-click-sound to="/solo" class="btn home__link">Jouer en solo</NuxtLink>
        <NuxtLink v-click-sound to="/lobby" class="btn btn--ghost home__link">Multijoueur</NuxtLink>
        <button v-click-sound class="btn btn--ghost home__link" type="button" @click="openRules">
          Les règles
        </button>
      </nav>
    </div>

    <RulesModal v-if="showRules" @close="showRules = false" />
  </main>
</template>

<script setup lang="ts">
// Le texte des règles vit dans RulesModal : l'accueil n'a plus qu'à l'ouvrir.
const showRules = ref(false)

function openRules(): void {
  showRules.value = true
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
}
</style>
