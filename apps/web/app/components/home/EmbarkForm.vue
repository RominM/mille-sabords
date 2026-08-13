<template>
  <form class="embark-form" @submit.prevent="submit">
    <div class="embark-form__body">
      <slot />
    </div>

    <div class="embark-form__cta">
      <p class="embark-form__hint" :class="{ 'embark-form__hint--error': error }">
        {{ error || hint }}
      </p>
      <PlateButton :disabled="disabled" @click="submit">{{ label }}</PlateButton>
    </div>
  </form>
</template>

<script setup lang="ts">
/**
 * Cadre commun des formulaires d'embarquement de l'accueil.
 *
 * Le panneau de l'accueil a une hauteur FIXE — il suit le décor. Le bouton
 * d'action doit donc rester visible quoi qu'on ajoute au formulaire : seul le
 * corps défile, la plaque reste posée en bas.
 *
 * Le composant ne connaît ni le mode ni la validité : il reçoit un état
 * `disabled` et rend une intention. C'est le formulaire qui sait ce qui manque.
 */
const props = defineProps({
  /** Formulaire incomplet : la plaque passe en grisé et n'émet plus rien. */
  disabled: { type: Boolean, default: false },
  label: { type: String, default: 'Embarquer' },
  /** Ce qu'il reste à faire, en une ligne. */
  hint: { type: String, default: '' },
  /** Refus venu d'ailleurs (le serveur, par exemple). Prime sur `hint`. */
  error: { type: String, default: '' }
})

const emit = defineEmits<{ submit: [] }>()

function submit(): void {
  if (props.disabled) return
  emit('submit')
}
</script>

<style scoped lang="scss">
.embark-form {
  height: 100%;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: var(--space-2);
  text-align: left;

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-right: var(--space-3);
    overflow-y: auto;
  }

  // La plaque déborde VOLONTAIREMENT de sa boîte, vers le haut : elle recouvre
  // la fin du formulaire sans jamais l'intercepter (son image ne prend pas le
  // pointeur), et le corps garde ainsi toute la hauteur disponible.
  // La plaque se mesure sur la PLANCHE, pas en pixels : à taille fixe, elle
  // dévorait la hauteur du formulaire dès que la fenêtre se resserrait.
  &__cta {
    --plate-w: min(20rem, 42cqw);

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  &__hint {
    min-height: 1.4em;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
    text-align: center;

    &--error {
      color: var(--danger-edge);
      font-weight: 600;
    }
  }
}
</style>
