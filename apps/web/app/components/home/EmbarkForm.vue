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
  // La plaque se mesure sur la PLANCHE, pas en pixels : à taille fixe, elle
  // dévorait la hauteur du formulaire dès que la fenêtre se resserrait.
  --plate-w: min(18rem, 38cqw);
  // Son ratio est de 1181/318 : la hauteur s'en déduit, et sert de garde au
  // corps qui défile dessous.
  --plate-h: calc(var(--plate-w) / 3.714);

  position: relative;
  height: 100%;
  text-align: left;

  // Le corps prend TOUTE la hauteur du cadre : la plaque flotte par-dessus son
  // bas, elle ne lui prend pas sa place. Le contenu passe donc derrière elle en
  // défilant, et la garde du bas lui permet de remonter au-dessus.
  &__body {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding-right: var(--space-3);
    padding-bottom: calc(var(--plate-h) + 2cqh + var(--space-4));
    // L'anneau de focus se dessine EN DEHORS du champ : sans cette gouttière, le
    // conteneur qui défile le rognait au ras du bord gauche. La marge négative
    // la reprend, pour que le formulaire reste aligné sur le reste du panneau.
    padding-left: var(--space-1);
    margin-left: calc(var(--space-1) * -1);
    overflow-y: auto;
  }

  // Posée DANS le cadre, à distance du bord : la plaque est dessinée avec un
  // débordement décoratif, et collée au bas elle mordait le bois.
  //
  // Le bloc laisse passer le pointeur — la molette doit continuer d'agir sur le
  // formulaire qui défile dessous — et seuls ses enfants le reprennent.
  &__cta {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2cqh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    pointer-events: none;

    > * {
      pointer-events: auto;
    }
  }

  &__hint {
    min-height: 1.2em;
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
