<script setup lang="ts">
import type { PirateCard } from '@ms/engine'
import treasure from '~/assets/images/cards/tresur_card.png'
import pirate from '~/assets/images/cards/pirate_card.png'
import skullsCard from '~/assets/images/cards/tow-skulls_card.png'
import guardian from '~/assets/images/cards/witch_card.png'
import goldCoin from '~/assets/images/cards/gold_coin_card.png'
import diamond from '~/assets/images/cards/diamond_card.png'
import animals from '~/assets/images/cards/monkey-parot_card.png'
import ship300 from '~/assets/images/cards/300_sabre.jpg'
import ship500 from '~/assets/images/cards/500_sabre.jpg'
import ship1000 from '~/assets/images/cards/1000_sabre.png'

const props = defineProps<{ card: PirateCard; skulls: number }>()

const NAME: Record<PirateCard['type'], string> = {
  'treasure-island': 'Île au Trésor',
  pirate: 'Pirate',
  skulls: 'Tête de Mort',
  guardian: 'Gardienne',
  ship: 'Bateau Pirate',
  coin: "Pièce d'or",
  diamond: 'Diamant',
  animals: 'Animaux',
}

const image = computed<string>(() => {
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

<template>
  <div class="pcard">
    <img :src="image" :alt="name" class="pcard__img" />
    <span v-if="skulls > 0" class="pcard__skulls">💀 {{ skulls }}</span>
  </div>
</template>

<style scoped lang="scss">
.pcard {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}
.pcard__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 6px 16px rgba(24, 14, 8, 0.7));
}
.pcard__skulls {
  position: absolute;
  top: 4%;
  right: 4%;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--on-danger);
  background: rgba(140, 47, 47, 0.85);
  border: 1px solid var(--danger-edge);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: clamp(0.7rem, 1.4vw, 1rem);
}
</style>
