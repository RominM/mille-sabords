<script setup lang="ts">
// Bouton d'action principal : le cachet de cire (image PNG fournie).
// La signature du jeu — on la retrouve sur Jouer / Lancer / S'arrêter / Rejouer.
import defaultSeal from '~/assets/images/ui/wax-seal-lancer.png'

const props = defineProps<{ label: string; disabled?: boolean; image?: string }>()
defineEmits<{ click: [] }>()

const sealUrl = computed(() => props.image ?? defaultSeal)
</script>
<template>
  <button class="wax" type="button" :aria-label="label" :disabled="disabled" @click="$emit('click')">
    <img :src="sealUrl" alt="" class="wax__img" />
  </button>
</template>

<style scoped lang="scss">
.wax {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  display: grid;
  place-items: center;
  transition: transform 0.08s ease;
  &:hover {
    transform: scale(1.03);
  }
}

.wax:active {
  transform: scale(0.97);
}
// Indisponible (lancer en cours, ou ce n'est pas notre tour) : légèrement grisé
.wax:disabled {
  opacity: 0.45;
  filter: grayscale(0.6);
  cursor: not-allowed;
}
.wax:disabled:hover {
  transform: none;
}
.wax__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(24, 14, 8, 0.6));
  pointer-events: none;
}
// Libellé sous le cachet (le PNG placeholder porte déjà un texte ;
// un cachet propre sans texte fonctionnera aussi avec ce libellé).
.wax__label {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  height: 40%;
  width: 40%;
  font-size: var(--fs-body-l);
  line-height: 40px;
  color: var(--accent);
  background-color: #b6060a;
  border-radius: 100%;
  white-space: nowrap;

  &:hover > .wax {
    transform: scale(1.03);
  }
}
</style>
