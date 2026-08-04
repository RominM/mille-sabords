<template>
  <div class="rules-panel">
    <h2 class="rules-panel__title">Règles</h2>
    <ul class="rules-panel__list" :class="{ 'rules-panel__list--dual': rules.length > 5 }">
      <li v-for="rule in rules" :key="rule" class="rules-panel__item">{{ rule }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * Règles affichées à plat, dans un panneau. Le pendant en surcouche pour le
 * plateau est `RulesModal` — les deux lisent le même `useRules`.
 */
const { rules } = useRules()
</script>

<style scoped lang="scss">
.rules-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-content: start;

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: var(--fs-display-m);
  }

  &__list {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
  }

  // Deux colonnes seulement si la liste est longue — et une seule dès que le
  // conteneur devient trop étroit pour les tenir.
  //
  // La largeur de colonne est le seuil de bascule : le navigateur ne passe à
  // deux colonnes que si `2 × largeur + gouttière` tient dans le conteneur.
  // 14rem plutôt que 18rem, sinon le panneau (~596px utiles) reste sur une
  // seule colonne alors qu'il a la place pour deux.
  &__list--dual {
    columns: 14rem 2;
    column-gap: var(--space-4);
  }

  &__item {
    margin-bottom: var(--space-2);
    break-inside: avoid; // une règle ne doit pas être coupée entre deux colonnes
  }
}
</style>
