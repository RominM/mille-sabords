<template>
  <Teleport to="body">
    <div class="bareme" :class="{ 'bareme--open': isOpen }">
      <img :src="panelUrl" alt="" class="bareme__img" />

      <!-- La languette dépasse seule quand le panneau est rentré : c'est la
           poignée. Elle reste atteignable en pleine partie sans rien masquer. -->
      <button
        v-click-sound
        class="bareme__tab"
        type="button"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? 'Fermer le barème' : 'Ouvrir le barème des points'"
        @click="isOpen = !isOpen"
      >
        <span class="bareme__tab-label">Barème</span>
      </button>

      <div class="bareme__content" :aria-hidden="!isOpen">
        <h2 class="bareme__title">Barème des points</h2>

        <ul class="bareme__list">
          <li v-for="line in COMBOS" :key="line.label">{{ line.label }} — {{ line.points }}</li>
        </ul>

        <ul class="bareme__list">
          <li v-for="line in BONUS" :key="line">{{ line }}</li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Barème des points, en tiroir sur le bord gauche.
 *
 * Toujours consultable pendant la partie sans gêner : seule la languette
 * dépasse, le panneau glisse au clic. `Teleport` vers le body car `.plateau`
 * déclare `container-type: size`, ce qui piégerait un `position: fixed`.
 */
import panelUrl from '~/assets/images/ui/panel-bareme.webp'

const isOpen = ref(false)

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
// Mesures du fichier panel-bareme.webp (816x1102) : la planche opaque va de
// 22,21 à 793,1080 (772x1060), dont les 94 derniers pixels de large sont la
// languette. Le corps fait donc 677 px, soit 87,7 % de la planche — c'est de
// cette part qu'on la sort de l'écran.
.bareme {
  position: fixed;
  left: 0;
  top: 70%;
  z-index: 60; // au-dessus du plateau, sous les modales (100)
  height: min(55dvh, 720px);
  aspect-ratio: 772 / 1060;
  transform: translate(-87.7%, -50%);
  transition: transform 0.32s ease;

  &--open {
    transform: translate(0, -50%);
  }

  &__img {
    position: absolute;
    inset: 0;
    // Le reset plafonne toute image à 100 % : à neutraliser pour l'agrandir.
    max-width: none;
    // 816/772 et 1102/1060 : le fichier ramené à la planche, puis décalé de la
    // marge transparente pour que l'opaque tombe pile sur la boîte.
    width: 105.7%;
    height: 104%;
    left: -2.85%;
    top: -1.98%;
    pointer-events: none;
  }

  // Zone de la languette, mesurée à 59..73 % de la hauteur.
  &__tab {
    position: absolute;
    right: 0;
    top: 40.5%;
    width: 12.3%;
    height: 14%;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  &__tab-label {
    display: block;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 0.85rem;
    writing-mode: vertical-rl;
    text-shadow: 0 1px 3px rgba(24, 14, 8, 0.9);
  }

  // Bois utile, à l'intérieur du liseré doré. Style volontairement minimal :
  // seul le CONTENU compte pour l'instant.
  &__content {
    position: absolute;
    left: 7%;
    top: 6%;
    width: 73%;
    height: 88%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 0.95rem;
    // Illisible et non cliquable tant que le tiroir est rentré.
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  &--open &__content {
    opacity: 1;
    pointer-events: auto;
  }

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 1.3rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding-left: var(--space-4);
    line-height: 1.35;
  }
}
</style>
