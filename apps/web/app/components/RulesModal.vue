<template>
  <Modal show-cross title="Règles du jeu" @close="emit('close')">
    <ul class="rules__list">
      <li v-for="rule in rules" :key="rule" class="rules__item">{{ rule }}</li>
    </ul>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Règles en surcouche, pour le plateau : en pleine partie on ne peut pas
 * quitter l'écran. Sur l'accueil, les mêmes règles s'affichent dans le panneau
 * de droite, sans modale.
 */
const emit = defineEmits<{ close: [] }>()

const { rules } = useRules()
</script>

<style scoped lang="scss">
.rules {
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding-left: var(--space-4);
    text-align: left;
  }

  // Le parchemin est clair : le texte du design system y serait illisible.
  &__item {
    color: #2a1c0e;
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
  }
}
</style>
