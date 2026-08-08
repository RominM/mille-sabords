<template>
  <div v-tooltip="EFFECT[card.type]" class="pcard">
    <img :src="image" :alt="name" class="pcard__img" />
    <!-- Sur 3, pas juste un nombre : le joueur doit lire d'un coup d'œil à quelle
         distance il est du tour perdu, dés ET carte confondus. -->
    <span v-if="skulls > 0" class="pcard__skulls">💀 {{ skulls }}/3</span>

    <p class="pcard__name">
      {{ name }}
      <span v-if="card.type === 'skulls'"> x {{ card.count }} </span>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { PirateCard } from '@rf/engine'
import treasure from '~/assets/images/cards/tresur_card.webp'
import pirate from '~/assets/images/cards/pirate_card.webp'
import oneSkullCard from '~/assets/images/cards/skull-card.webp'
import twoSkullsCard from '~/assets/images/cards/tow-skulls_card.webp'
import guardian from '~/assets/images/cards/witch_card.webp'
import goldCoin from '~/assets/images/cards/gold_coin_card.webp'
import diamond from '~/assets/images/cards/diamond_card.webp'
import animals from '~/assets/images/cards/monkey-parot_card.webp'
import ship300 from '~/assets/images/cards/300_sabre.webp'
import ship500 from '~/assets/images/cards/500_sabre.webp'
import ship1000 from '~/assets/images/cards/1000_sabre.webp'

const props = defineProps<{ card: PirateCard; skulls: number }>()

/**
 * Ce que la carte CHANGE, en une phrase. Le dessin dit laquelle c'est, pas ce
 * qu'elle fait — et une carte mal comprise coûte un tour.
 */
const EFFECT: Record<PirateCard['type'], string> = {
  'treasure-island': 'Île au Trésor : les dés gardés sont réservés sur la carte et comptent à la fin, même après trois têtes.',
  pirate: 'Carte Pirate : les points du tour sont doublés. Les têtes de mort du Bateau valent 200 au lieu de 100.',
  skulls: 'Tête de Mort : elle compte comme une tête déjà sortie, avant même ton premier lancer.',
  guardian: 'Gardienne : une fois dans le tour, tu peux relancer une tête de mort déjà tombée.',
  ship: 'Bateau Pirate : réunis le quota de sabres pour empocher la prime — sinon tu la perds.',
  coin: 'Pièce d’or : elle compte comme une pièce supplémentaire, +100 points.',
  diamond: 'Diamant : il compte comme un diamant supplémentaire, +100 points.',
  animals: 'Animaux : singes et perroquets se comptent ensemble pour former une combinaison.'
}

const NAME: Record<PirateCard['type'], string> = {
  'treasure-island': 'Île au Trésor',
  pirate: 'Pirate',
  skulls: 'Tête de Mort',
  guardian: 'Gardienne',
  ship: 'Bateau Pirate',
  coin: "Pièce d'or",
  diamond: 'Diamant',
  animals: 'Animaux'
}

/** Illustration correspondant à la carte du tour. */
const image = computed<string>(function pickImage() {
  const c = props.card
  switch (c.type) {
    case 'treasure-island':
      return treasure
    case 'pirate':
      return pirate
    case 'skulls':
      // Une illustration par valeur : l'image dit enfin ce que la carte apporte.
      // `c` et non `props.card` : c'est lui que le `switch` a réduit au variant
      // `skulls`, seul à porter un `count`.
      return c.count === 1 ? oneSkullCard : twoSkullsCard
    case 'guardian':
      return guardian
    case 'coin':
      return goldCoin
    case 'diamond':
      return diamond
    case 'animals':
      return animals
    case 'ship':
      return c.value >= 1000 ? ship1000 : c.value >= 500 ? ship500 : ship300
  }
})

const name = computed(() => NAME[props.card.type])
</script>

<style scoped lang="scss">
.pcard {
  position: relative;
  display: grid;
  place-items: start center;
  width: 100%;
  height: 100%;

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 6px 16px rgba(24, 14, 8, 0.7));
  }

  // Rappel du nombre de têtes de mort en cours (dés + carte)
  &__skulls {
    position: absolute;
    top: 4%;
    right: 4%;
    padding: 0.3cqw 0.8cqw;
    border: 1px solid var(--danger-edge);
    border-radius: 6px;
    background: rgba(140, 47, 47, 0.85);
    color: var(--on-danger);
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 1.6cqw;
  }

  // Nom de la carte, dans le bandeau libre sous l'illustration
  &__name {
    padding: 0 8px;
    font-family: var(--font-body);
    font-size: clamp(0.5rem, 18px, 2rem);
    text-align: center;
    white-space: nowrap;
  }
}
</style>
