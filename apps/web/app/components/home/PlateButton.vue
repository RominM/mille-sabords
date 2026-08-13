<template>
  <button class="plate" type="button" :disabled="disabled" @click="onClick">
    <img :src="plateUrl" alt="" class="plate__img" />
    <span class="plate__label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
/**
 * Appel à l'action principal : la plaque de bois cerclée d'or.
 *
 * Elle porte son propre bruitage — le choc de hache — au lieu du clic générique
 * des autres boutons : c'est la signature sonore de l'action majeure. Pas de
 * `v-click-sound` ici, sinon les deux sons partiraient ensemble.
 */
import plateUrl from '~/assets/images/ui/main-cta.webp'
import axeImpact from '~/assets/sounds/axe-impact.mp3'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ click: [] }>()

const { play } = useSfx()

function onClick(): void {
  play(axeImpact)
  emit('click')
}
</script>

<style scoped lang="scss">
// La plaque est un dessin : le bouton épouse le ratio de sa partie opaque
// (1181x318 dans un fichier 1536x1024), sinon le libellé ne tomberait pas sur
// le bois. `container-type` permet ensuite de dimensionner le texte en
// proportion de la plaque, quelle que soit sa taille à l'écran.
.plate {
  position: relative;
  display: grid;
  place-items: center;
  width: min(20rem, 100%);
  aspect-ratio: 1181 / 318;
  container-type: size;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition: transform 0.1s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  // L'image déborde de la boîte : sa partie opaque doit venir exactement
  // dessus. 1536/1181 = 130 %, décalée de la position de la plaque dans le
  // fichier (x 179/1536, y 331/1024).
  &__img {
    position: absolute;
    // Le reset plafonne toute image à 100 % : à neutraliser pour agrandir.
    max-width: none;
    width: 130.1%;
    height: 322%;
    left: -15.2%; // -179/1536 x 130,1
    top: -104.1%; // -331/1024 x 322,0
    pointer-events: none;
  }

  // Le libellé reste sur le bois, à l'intérieur du liseré doré (~8 % du bord).
  &__label {
    position: relative;
    z-index: 1;
    padding: 0 12%;
    margin-bottom: 12px;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 32cqh;
    line-height: 1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-shadow: 0 2px 4px rgba(24, 14, 8, 0.85);
    white-space: nowrap;
  }
}
</style>
