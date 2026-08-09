<template>
  <button
    v-click-sound="canClick"
    class="die-view"
    :class="{
      'die-view--clickable': canClick,
      'die-view--selected': selected,
      'die-view--locked': die.locked,
      'die-view--banked': die.banked,
      'die-view--rescuable': rescuable && die.locked
    }"
    :disabled="die.locked && !rescuable"
    type="button"
    :aria-label="die.face ?? 'dé vide'"
    @click="onClick"
  >
    <DieCube
      :face="die.face"
      :roll="roll"
      :delay="delay"
      :duration="duration"
      :silent="silent"
      :seated="seated"
      :motion="motion"
      :travel="travel"
      :heading="heading"
    />
  </button>
</template>

<script setup lang="ts">
/**
 * Un dé sur la table : son ÉTAT et son interaction.
 *
 * Le rendu proprement dit est délégué à `DieCube` — la séparation vaut d'être
 * gardée : ici vivent le clic, le verrou de la tête de mort, la réserve de
 * l'Île au Trésor ; là-bas, la géométrie et l'animation. Aucun des deux n'a
 * besoin de connaître l'autre.
 */
import type { Die } from '@rf/engine'

const props = defineProps<{
  die: Die
  clickable?: boolean
  selected?: boolean
  /** Tête de mort récupérable par la Gardienne : elle redevient cliquable. */
  rescuable?: boolean
  /** Compteur de jets : toute incrémentation fait rouler le dé. */
  roll?: number
  /** Retard au départ, pour égrener la volée au lieu de la lancer d'un bloc. */
  delay?: number
  duration?: number
  /** Un dé silencieux : une volée n'a pas besoin de huit bruitages. */
  silent?: boolean
  /** Dé rangé dans un des huit cadres du bas, par opposition à jeté sur la table. */
  seated?: boolean
  /** `roll` = il traverse la table ; `tumble` = il culbute sur place. */
  motion?: 'tumble' | 'roll'
  /** Distance du roulé, en côtés de dé. */
  travel?: number
  /** Direction du roulé, en degrés. */
  heading?: number
}>()
const emit = defineEmits<{ click: [] }>()

/**
 * Un dé n'est cliquable que s'il est lancé et que la phase le permet. Une tête
 * de mort est maudite — sauf quand la Gardienne peut la reprendre, seul cas où
 * un dé verrouillé accepte le clic.
 */
const canClick = computed(
  () => props.clickable && props.die.face !== null && (!props.die.locked || !!props.rescuable)
)

function onClick(): void {
  if (canClick.value) emit('click')
}
</script>

<style scoped lang="scss">
// Le bouton n'est plus qu'une zone de clic et un porte-état : c'est le cube
// qui occupe la boîte, à la taille que lui donne `--die-size`.
.die-view {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: not-allowed;

  &--clickable {
    cursor: inherit;

    // Pas de `transform` sur le bouton : il aplatirait la scène 3D du cube.
    // On surélève le dé par son propre décalage, qui reste dans le plan.
    &:hover .die-cube {
      translate: 0 -6%;
    }
  }

  // ── États ────────────────────────────────────────────────────────────────
  // Un liseré plat autour d'un objet en volume jurerait : l'état se dit par un
  // halo posé au sol, sous le dé. Surtout, un `filter` sur un ancêtre du cube
  // APLATIRAIT sa scène 3D — d'où cet anneau en pseudo-élément, à part.
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 2%;
    width: 96%;
    height: 26%;
    translate: -50% 0;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &--selected::before {
    opacity: 1;
    background: radial-gradient(ellipse at center, rgba(232, 196, 104, 0.75), transparent 70%);
  }

  &--locked::before {
    opacity: 1;
    background: radial-gradient(ellipse at center, rgba(192, 82, 75, 0.8), transparent 70%);
  }

  &--banked::before {
    opacity: 1;
    background: radial-gradient(ellipse at center, rgba(47, 110, 104, 0.85), transparent 70%);
  }

  // Tête de mort que la Gardienne peut reprendre : elle doit se distinguer des
  // autres têtes, sinon le joueur ne devine pas qu'elle est encore jouable.
  &--rescuable {
    cursor: pointer;

    &::before {
      opacity: 1;
      background: radial-gradient(ellipse at center, rgba(232, 196, 104, 0.9), transparent 70%);
      animation: rescuable-pulse 1.4s ease-in-out infinite;
    }
  }

  @keyframes rescuable-pulse {
    0%,
    100% {
      opacity: 0.35;
      scale: 0.9;
    }
    50% {
      opacity: 1;
      scale: 1.12;
    }
  }
}
</style>
