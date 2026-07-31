<script setup lang="ts">
// Bouton d'action principal : le cachet de cire (image PNG fournie).
// La signature du jeu — on la retrouve sur Jouer / Lancer / Rejouer.
import sealUrl from '~/assets/images/seal-btn.png'

defineProps<{ label: string; disabled?: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button class="wax" type="button" :aria-label="label" :disabled="disabled" @click="$emit('click')">
    <img :src="sealUrl" alt="" class="wax__img" />
    <span class="wax__label">{{ label }}</span>
  </button>
</template>

<style scoped lang="scss">
.wax {
  position: relative;
  width: 150px;
  height: 150px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: transform 0.08s ease;
}
.wax:hover {
  transform: scale(1.03);
}
.wax:active {
  transform: scale(0.97);
}
.wax:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  bottom: -1.4rem;
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: var(--fs-body-l);
  color: var(--accent);
  white-space: nowrap;
}
</style>
