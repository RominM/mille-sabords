<template>
  <div class="pcard">
    <img :src="image" :alt="name" class="pcard__img" />
    <span v-if="skulls > 0" class="pcard__skulls">💀 {{ skulls }}</span>
    <p class="pcard__name">{{ name }}</p>
  </div>
</template>

<script setup lang="ts">
import type { PirateCard } from '@rf/engine'
import treasure from '~/assets/images/cards/tresur_card.webp'
import pirate from '~/assets/images/cards/pirate_card.webp'
import skullsCard from '~/assets/images/cards/tow-skulls_card.webp'
import guardian from '~/assets/images/cards/witch_card.webp'
import goldCoin from '~/assets/images/cards/gold_coin_card.webp'
import diamond from '~/assets/images/cards/diamond_card.webp'
import animals from '~/assets/images/cards/monkey-parot_card.webp'
import ship300 from '~/assets/images/cards/300_sabre.webp'
import ship500 from '~/assets/images/cards/500_sabre.webp'
import ship1000 from '~/assets/images/cards/1000_sabre.webp'

const props = defineProps<{ card: PirateCard; skulls: number }>()

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
      return skullsCard
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
