<template>
  <fieldset class="display-settings">
    <legend class="display-settings__legend">Affichage</legend>
    <p class="display-settings__hint">
      Le plateau prend toute la place qu'on lui donne : sans les barres du
      navigateur, les dés gagnent en taille.
    </p>

    <div class="display-settings__row">
      <input
        id="setting-fullscreen"
        class="display-settings__check"
        type="checkbox"
        :checked="active"
        :disabled="!supported"
        @change="onToggle"
      />
      <label class="display-settings__label" for="setting-fullscreen">Plein écran</label>

      <span v-if="!supported" class="display-settings__note">
        Indisponible sur cet appareil — la touche F11 reste possible.
      </span>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
/**
 * Réglages d'écran. Le plein écran ne se retient PAS d'une visite à l'autre :
 * le navigateur exige un geste du joueur pour l'accorder, on ne peut donc pas
 * le rétablir tout seul au chargement. La case dit l'état du moment.
 */
const { active, supported, toggle } = useFullscreen()

/**
 * La case ne DÉCIDE pas de son état, elle le reflète : c'est le navigateur qui
 * accorde ou refuse le plein écran. Un refus ne changeant pas `active`, Vue n'a
 * rien à redessiner — on remet donc la case dans l'état réel à la main, sans
 * quoi elle resterait cochée sur une demande rejetée.
 */
async function onToggle(event: Event): Promise<void> {
  await toggle()
  ;(event.target as HTMLInputElement).checked = active.value
}
</script>

<style scoped lang="scss">
.display-settings {
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
  }

  &__note {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
  }

  &__check {
    width: 1.4rem;
    height: 1.4rem;
    accent-color: var(--accent);
  }
}
</style>
