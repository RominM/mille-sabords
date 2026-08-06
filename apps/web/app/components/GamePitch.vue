<template>
  <div class="pitch">
    <h2 class="pitch__title">{{ title }}</h2>
    <p class="pitch__text">{{ text }}</p>
    <PlateButton @click="emit('embark')">Embarquer</PlateButton>
  </div>
</template>

<script setup lang="ts">
/**
 * Accroche d'un mode de jeu : titre, description, action d'entrée.
 *
 * Le composant ne navigue pas lui-même — il émet `embark` et laisse l'appelant
 * décider de la suite, qui diffère selon le mode (choix de difficulté en solo,
 * formulaire d'équipage en multi).
 */
defineProps<{ title: string; text: string }>()

const emit = defineEmits<{ embark: [] }>()
</script>

<style scoped lang="scss">
.pitch {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  text-align: center;

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 3.25rem;
    line-height: 1.05;
  }

  &__text {
    max-width: 38ch;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.4rem;
  }

}
</style>
