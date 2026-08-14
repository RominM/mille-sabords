<template>
  <SidePanel
    id="bareme"
    label="Barème des points"
    title="Barème des points"
    hint="Barème des points — ce que rapporte chaque combinaison de dés"
    :icon="Scroll"
    :top="62"
    :shift="-7"
  >
    <div class="bareme">
      <h3 class="bareme__heading">Chaque trésor</h3>
      <ul class="bareme__list">
        <li v-for="treasure in TREASURES" :key="treasure" class="bareme__row">
          <span class="bareme__symbols">
            <span class="bareme__die" :style="art(treasure)" />
          </span>
          <span class="bareme__points mono">+100</span>
        </li>
      </ul>

      <h3 class="bareme__heading">Symboles identiques</h3>
      <ul class="bareme__list">
        <li v-for="combo in COMBOS" :key="combo.count" class="bareme__row">
          <span class="bareme__symbols">
            <span class="bareme__die bareme__die--any" />
            <span class="bareme__times mono">× {{ combo.count }}</span>
          </span>
          <span class="bareme__points mono">{{ combo.points }}</span>
        </li>
      </ul>

      <h3 class="bareme__heading">Bonus</h3>
      <ul class="bareme__list">
        <li class="bareme__row">
          <span class="bareme__symbols bareme__symbols--chest">
            <span v-for="n in 8" :key="n" class="bareme__die bareme__die--any bareme__die--tiny" />
          </span>
          <span class="bareme__points mono">+500</span>
          <small class="bareme__note">Coffre plein — les 8 dés marquent.</small>
        </li>

        <li class="bareme__row">
          <span class="bareme__symbols">
            <img :src="pirateCard" alt="" class="bareme__card" />
          </span>
          <span class="bareme__points mono">× 2</span>
          <small class="bareme__note">Carte Pirate — le tour est doublé</small>
        </li>

        <li class="bareme__row">
          <span class="bareme__symbols">
            <span class="bareme__die" :style="art('coin')" />
            <span class="bareme__times mono">× 9</span>
          </span>
          <span class="bareme__points bareme__points--win">Gagné</span>
          <small class="bareme__note">Magie pirate — 8 dés et une carte du même symbole.</small>
        </li>
      </ul>

      <h3 class="bareme__heading bareme__heading--danger">Danger</h3>
      <ul class="bareme__list">
        <li class="bareme__row">
          <span class="bareme__symbols">
            <span class="bareme__die" :style="art('skull')" />
            <span class="bareme__times mono">× 3</span>
          </span>
          <span class="bareme__points bareme__points--lost mono">0</span>
          <small class="bareme__note">Tour perdu — les têtes ne se relancent pas</small>
        </li>
      </ul>
    </div>
  </SidePanel>
</template>

<script setup lang="ts">
/**
 * Barème des points, en tiroir sur le bord gauche.
 *
 * Il se lit d'un COUP D'ŒIL, en pleine décision : des dés et des nombres, pas
 * des phrases. Le dé sans symbole dit « n'importe lequel » — c'est la règle
 * même, trois faces identiques valent 100 quel que soit le symbole.
 *
 * Ce composant ne porte que le CONTENU : la planche, la languette et le
 * glissement vivent dans `SidePanel`, partagé avec l'historique des tours.
 *
 * Les valeurs recopient `packages/engine/src/scoring.ts`, qui fait foi.
 */
import type { DieFace } from '@rf/engine'
import { Scroll } from 'lucide-vue-next'
import sabre from '~/assets/images/dice/die-face_sabre.webp'
import skull from '~/assets/images/dice/die-face_skull.webp'
import monkey from '~/assets/images/dice/die-face_monkey.webp'
import parrot from '~/assets/images/dice/die-face_parot.webp'
import coin from '~/assets/images/dice/die-fice_coin.webp'
import diamond from '~/assets/images/dice/die-face_diamond.webp'
import pirateCard from '~/assets/images/cards/pirate_card.webp'

const FACE_ART: Record<DieFace, string> = { sabre, skull, monkey, parrot, coin, diamond }

const COMBOS: { count: number; points: number }[] = [
  { count: 3, points: 100 },
  { count: 4, points: 200 },
  { count: 5, points: 500 },
  { count: 6, points: 1000 },
  { count: 7, points: 2000 },
  { count: 8, points: 4000 }
]

/** Les deux faces qui valent 100 à elles seules, en plus des combinaisons. */
const TREASURES: DieFace[] = ['coin', 'diamond']

function art(face: DieFace): Record<string, string> {
  return { backgroundImage: `url(${FACE_ART[face]})` }
}
</script>

<style scoped lang="scss">
.bareme {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__heading {
    padding-bottom: 0.15em;
    border-bottom: 1px solid rgba(201, 162, 39, 0.35);
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 1.15rem;
    letter-spacing: 0.04em;

    &--danger {
      border-bottom-color: rgba(192, 82, 75, 0.45);
      color: var(--danger-edge);
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    margin: 0 0 var(--space-2);
    padding: 0;
    list-style: none;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 0 var(--space-2);
  }

  &__symbols {
    display: flex;
    align-items: center;
    gap: 0.35em;

    // Les huit dés du coffre tiennent sur la largeur de la planche : ils se
    // resserrent plutôt que de déborder.
    &--chest {
      gap: 0.15em;
    }
  }

  // Le dé sans symbole vaut « n'importe quel symbole ». Il reprend la matière
  // des vraies faces — bois sombre cerclé d'or — sans en montrer aucune.
  &__die {
    flex: 0 0 auto;
    width: 1.55rem;
    height: 1.55rem;
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;

    &--any {
      border: 1px solid rgba(201, 162, 39, 0.7);
      border-radius: 22%;
      background-image: linear-gradient(158deg, #5a3d29, #33200f);
      box-shadow: inset 0 0 0.35rem rgba(24, 14, 8, 0.85);
    }

    &--tiny {
      width: 1.1rem;
      height: 1.1rem;
    }
  }

  &__card {
    width: 1.5rem;
    border-radius: 2px;
  }

  &__times {
    color: var(--text-dim);
    font-size: 0.95rem;
  }

  &__points {
    color: var(--accent);
    font-size: 1.05rem;
    font-variant-numeric: tabular-nums;

    &--lost {
      color: var(--danger-edge);
    }

    &--win {
      color: var(--accent-hi);
      font-family: var(--font-display);
      font-size: 1.2rem;
      letter-spacing: 0.04em;
    }
  }

  &__note {
    grid-column: 1 / -1;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 0.8rem;
    line-height: 1.25;
  }
}
</style>
