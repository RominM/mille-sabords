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
.plate {
  position: relative;
  display: grid;
  place-items: center;
  // Réglable par le contexte : posée dans un décor qui se met à l'échelle, la
  // plaque doit suivre le décor et non garder une taille absolue.
  width: var(--plate-w, min(20rem, 100%));
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

  // Hors d'usage : la plaque perd son or plutôt que sa présence. Le geste reste
  // visible et lisible — il manque juste quelque chose pour l'accomplir.
  &:disabled {
    filter: grayscale(1);
    opacity: 0.7;
    cursor: not-allowed;
  }

  &__img {
    position: absolute;
    max-width: none;
    width: 130.1%;
    height: 322%;
    left: -15.2%; // -179/1536 x 130,1
    top: -104.1%; // -331/1024 x 322,0
    pointer-events: none;
  }

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
