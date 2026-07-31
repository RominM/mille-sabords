<script setup lang="ts">
import type { PirateCard } from '@ms/engine'

const props = defineProps<{ card: PirateCard; skulls: number }>()

const info = computed<{ name: string; effect: string }>(() => {
  const c = props.card
  switch (c.type) {
    case 'treasure-island':
      return { name: 'Île au Trésor', effect: 'Réserve des dés : ils restent acquis même en cas de 3ᵉ tête.' }
    case 'pirate':
      return { name: 'Pirate', effect: 'Points du tour doublés. Malus de l’Île doublé.' }
    case 'skulls':
      return { name: `Tête de Mort ×${c.count}`, effect: `${c.count} tête(s) de mort offerte(s) au départ.` }
    case 'guardian':
      return { name: 'Gardienne', effect: 'Une tête de mort relançable, une seule fois (bientôt dans l’UI).' }
    case 'ship':
      return { name: `Bateau Pirate — ${c.sabres} sabres`, effect: `Réunis ${c.sabres} sabres → +${c.value}, sinon −${c.value}. Jamais d’Île.` }
    case 'coin':
      return { name: "Pièce d'or", effect: 'Une pièce virtuelle en plus (+100).' }
    case 'diamond':
      return { name: 'Diamant', effect: 'Un diamant virtuel en plus (+100).' }
    case 'animals':
      return { name: 'Animaux', effect: 'Singes et perroquets comptent comme un même symbole.' }
  }
  return { name: '', effect: '' }
})
</script>

<template>
  <div class="card-zone">
    <div class="card-name">{{ info.name }}</div>
    <p class="card-effect">{{ info.effect }}</p>
    <p v-if="skulls > 0" class="card-skulls">{{ skulls }} tête{{ skulls > 1 ? 's' : '' }} de mort</p>
  </div>
</template>

<style scoped lang="scss">
.card-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}
.card-effect {
  color: var(--text-dim);
  max-width: 52ch;
}
.card-skulls {
  color: var(--danger-edge);
  font-weight: 600;
}
</style>
