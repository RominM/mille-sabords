<template>
  <div class="rules-panel">
    <div>
      <h3>🎯 But du jeu</h3>
      <p>
        Reckless Fathoms est un jeu de dés de type "Push your luck".
        <br />
        Le but de Reckless Fathoms est d'être le pirate qui accumule le plus de points au cours de la partie.
        <br />
        Chaque joueur cherche à réaliser les meilleures combinaisons de dés et à prendre des risques pour
        augmenter son score. Plus les combinaisons sont intéressantes, plus elles rapportent de points.
      </p>

      <h3>🏴‍☠️ Déroulement d'une partie</h3>
      <p>
        Les joueurs jouent chacun leur tour. À son tour, un joueur lance les dés et tente de construire une
        combinaison suffisamment intéressante pour marquer des points. Il peut continuer à jouer pour essayer
        d'améliorer son score, mais plus il poursuit son tour, plus il prend le risque de tout perdre sur son
        lancer.
        <br />
        Le joueur doit donc constamment choisir entre : S'arrêter et sécuriser ses points ou Continuer et
        tenter de gagner davantage.
        <br />
        Une fois qu'il décide de s'arrêter, les points obtenus pendant son tour sont ajoutés à son score total
        et le joueur suivant prend la main.
        <br />
        La partie continue ainsi, chaque pirate essayant de dépasser les autres au fil des tours.
      </p>

      <h3>⚔️ Fin de partie</h3>
      <p>
        Lorsqu'un joueur atteint le score nécessaire pour déclencher la fin de partie (6000 points), les
        autres joueurs disposent généralement d'un dernier tour pour tenter de le dépasser.
        <br />
        À l'issue de ces derniers tours, le joueur ayant accumulé le plus de points remporte la partie.
      </p>
    </div>
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

/**
  * 🎯 But du jeu
Reckless Fathoms est un jeu de dés de type "Push your luck"

Le but de Reckless Fathoms est d'être le pirate qui accumule le plus de points au cours de la partie.
Chaque joueur cherche à réaliser les meilleures combinaisons de dés et à prendre des risques pour augmenter son score. Plus les combinaisons sont intéressantes, plus elles rapportent de points.

🏴‍☠️ Déroulement d'une partie
Les joueurs jouent chacun leur tour.
À son tour, un joueur lance les dés et tente de construire une combinaison suffisamment intéressante pour marquer des points. Il peut continuer à jouer pour essayer d'améliorer son score, mais plus il poursuit son tour, plus il prend le risque de tout perdre sur son lancer.
Le joueur doit donc constamment choisir entre :
S'arrêter et sécuriser ses points
ou
Continuer et tenter de gagner davantage.

Une fois qu'il décide de s'arrêter, les points obtenus pendant son tour sont ajoutés à son score total et le joueur suivant prend la main.
La partie continue ainsi, chaque pirate essayant de dépasser les autres au fil des tours.

⚔️ Fin de partie
Lorsqu'un joueur atteint le score nécessaire pour déclencher la fin de partie (6000 points), les autres joueurs disposent généralement d'un dernier tour pour tenter de le dépasser.

À l'issue de ces derniers tours, le joueur ayant accumulé le plus de points remporte la partie.
  */
const { rules } = useRules()
</script>

<style scoped lang="scss">
.rules-panel {
  // Le seul contenu de l'accueil qui dépasse : il porte donc son propre
  // défilement, plutôt que de l'imposer au panneau qui l'accueille.
  height: 90%;
  overflow-y: auto;

  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-content: start;

  &__list {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.2rem;
    line-height: 1.45;
  }

  &__list--dual {
    columns: 20rem 2;
    column-gap: var(--space-5);
  }

  &__item {
    margin-bottom: var(--space-2);
    break-inside: avoid; // une règle ne doit pas être coupée entre deux colonnes
  }
}
</style>
