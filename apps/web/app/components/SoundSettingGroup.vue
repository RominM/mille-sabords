<template>
  <fieldset class="sound-group">
    <legend class="sound-group__legend">{{ title }}</legend>
    <p class="sound-group__hint">{{ hint }}</p>

    <div class="sound-group__row">
      <input :id="`${id}-on`" v-model="enabled" class="sound-group__check" type="checkbox" />
      <label class="sound-group__label" :for="`${id}-on`">Activé</label>

      <input
        :id="`${id}-vol`"
        v-model.number="volume"
        class="sound-group__range"
        type="range"
        min="0"
        max="100"
        step="1"
        :disabled="!enabled"
        :aria-label="`Volume — ${title}`"
      />
      <output class="sound-group__value">{{ volume }} %</output>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
/**
 * Réglage d'une famille de sons : on l'active, on en règle le volume.
 *
 * Le composant ne connaît AUCUNE famille en particulier — il reçoit son libellé
 * et deux `v-model`. C'est l'appelant qui décide s'il pilote la musique, les
 * bruitages, ou ce qui viendra ensuite (voix, sons de dés séparés…).
 */
defineProps<{
  /** Préfixe des `id` : deux instances ne doivent pas collisionner. */
  id: string
  title: string
  hint: string
}>()

const enabled = defineModel<boolean>('enabled', { required: true })
const volume = defineModel<number>('volume', { required: true })
</script>

<style scoped lang="scss">
.sound-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0; // le fieldset n'est là que pour grouper sémantiquement

  &__legend {
    padding: 0;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 1.75rem;
  }

  &__hint {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 1.05rem;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__label {
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.1rem;
    cursor: pointer;
  }

  &__value {
    min-width: 4rem;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 1.1rem;
    text-align: right;
  }

  &__check {
    width: 1.4rem;
    height: 1.4rem;
    accent-color: var(--accent);
    cursor: pointer;
  }

  // Piste en Chêne Vieilli, curseur en Doublon. `appearance: none` impose de
  // redessiner piste et curseur pour chaque moteur — d'où les deux familles de
  // sélecteurs, qui ne peuvent pas être regroupées (un sélecteur inconnu
  // invaliderait toute la règle).
  &__range {
    flex: 1;
    height: 1.25rem;
    appearance: none;
    background: transparent;
    cursor: pointer;

    &::-webkit-slider-runnable-track {
      height: 0.4rem;
      border-radius: 999px;
      background: var(--color-oak);
    }

    &::-moz-range-track {
      height: 0.4rem;
      border-radius: 999px;
      background: var(--color-oak);
    }

    &::-webkit-slider-thumb {
      appearance: none;
      width: 1rem;
      height: 1rem;
      // Recentre le curseur sur une piste de 0.4rem.
      margin-top: -0.3rem;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: var(--shadow-1);
    }

    &::-moz-range-thumb {
      width: 1rem;
      height: 1rem;
      border: 0;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: var(--shadow-1);
    }

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 4px;
    }

    // Famille coupée : le curseur reste lisible mais visiblement inopérant.
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
</style>
