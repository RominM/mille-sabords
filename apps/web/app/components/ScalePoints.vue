<template>
  <SidePanel label="Barème" title="Barème des points">
    <ul class="bareme__list">
      <li v-for="line in COMBOS" :key="line.label">{{ line.label }} — {{ line.points }}</li>
    </ul>

    <ul class="bareme__list">
      <li v-for="line in BONUS" :key="line">{{ line }}</li>
    </ul>
  </SidePanel>
</template>

<script setup lang="ts">
/**
 * Barème des points, en tiroir sur le bord gauche.
 *
 * Ce composant ne porte plus que le CONTENU : la planche, la languette et le
 * glissement vivent dans `SidePanel`, partagé avec l'historique des tours.
 */
const COMBOS = [
  { label: '3 symboles identiques', points: '100 points' },
  { label: '4 symboles identiques', points: '200 points' },
  { label: '5 symboles identiques', points: '500 points' },
  { label: '6 symboles identiques', points: '1000 points' },
  { label: '7 symboles identiques', points: '2000 points' },
  { label: '8 symboles identiques', points: '4000 points' }
]

const BONUS = [
  'Chaque pièce d’or : +100 points',
  'Chaque diamant : +100 points',
  'Coffre au trésor plein — les 8 dés rapportent : +500 points',
  'Carte Pirate : points du tour doublés',
  '9 symboles identiques : victoire immédiate'
]
</script>

<style scoped lang="scss">
.bareme__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-4);
  line-height: 1.35;
}
</style>
