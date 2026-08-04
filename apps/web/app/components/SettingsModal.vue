<template>
  <Modal show-cross title="Paramètres" @close="emit('close')">
    <ul class="settings__list">
      <li class="settings__row">
        <label class="settings__label" for="settings-music">Musique d’ambiance</label>
        <input id="settings-music" v-model="musicEnabled" type="checkbox" class="settings__switch" />
      </li>
    </ul>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Réglages sonores. L'état vit dans `useSoundSettings` et non ici : la modale
 * est détruite à la fermeture, le réglage doit lui survivre.
 */
const emit = defineEmits<{ close: [] }>()

const { musicEnabled } = useSoundSettings()
</script>

<style scoped lang="scss">
.settings {
  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  // Le parchemin est clair : le texte du design system y serait illisible.
  &__label {
    color: #2a1c0e;
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
    cursor: pointer;
  }

  &__switch {
    width: 1.2rem;
    height: 1.2rem;
    accent-color: #6b3f14;
    cursor: pointer;
  }
}
</style>
