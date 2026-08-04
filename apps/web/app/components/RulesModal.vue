<template>
  <Modal show-cross title="Règles du jeu" @close="emit('close')">
    <ul class="rules__list">
      <li v-for="rule in RULES" :key="rule" class="rules__item">{{ rule }}</li>
    </ul>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Résumé des règles montré au joueur. Source unique, partagée par l'accueil et
 * le plateau — le barème qui fait foi reste celui du moteur, ceci n'en est
 * qu'une lecture.
 */
import { WINNING_SCORE } from '@rf/engine'

// `close` est simplement relayé depuis la Modal : le parent décide de l'affichage.
const emit = defineEmits<{ close: [] }>()

const RULES: string[] = [
  `Le premier à ${WINNING_SCORE} points déclenche le dernier tour — le meilleur score l'emporte.`,
  'Trois têtes de mort et le tour est perdu : les têtes sont maudites, impossible de les relancer.',
  'Une relance se fait avec au moins deux dés ; garde ceux qui rapportent.',
  'Trois symboles identiques ou plus rapportent des points (100 pour 3, jusqu’à 4000 pour 8).',
  'Chaque pièce d’or et chaque diamant valent 100 points de plus.',
  'Les 8 dés sur la même valeur : coffre au trésor plein, +500 points.',
  'Quatre têtes de mort au premier lancer, et te voilà sur l’Île de la Tête-de-Mort : tes adversaires trinquent.'
]
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
