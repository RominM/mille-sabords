<template>
  <p class="board-hint" :class="`board-hint--${tone}`">{{ text }}</p>
</template>

<script setup lang="ts">
/**
 * La ligne d'aide contextuelle du plateau.
 *
 * Volontairement MUETTE : elle reçoit un texte et un ton, elle ne décide de
 * rien. C'est la page qui sait quelle règle s'applique — la Gardienne, l'Île au
 * Trésor, un refus du moteur — et le composant n'a pas à redouter cette logique
 * une seconde fois.
 */
import type { PropType } from 'vue'

export type HintTone = 'info' | 'danger' | 'guardian'

defineProps({
  text: { type: String, required: true },
  tone: { type: String as PropType<HintTone>, default: 'info' }
})
</script>

<style scoped lang="scss">
.board-hint {
  position: absolute;
  left: 50%;
  top: 64.6%;
  translate: -50% 0;
  width: 52%;
  color: var(--text);
  font-size: 1.25cqw;
  font-weight: 300;
  line-height: 1.2;
  text-align: center;
  text-shadow: 0 1px 3px rgba(24, 14, 8, 0.85);
  pointer-events: none;

  &--danger {
    color: var(--danger-edge);
    font-weight: 600;
  }

  &--guardian {
    color: var(--accent);
    font-weight: 600;
  }
}
</style>
