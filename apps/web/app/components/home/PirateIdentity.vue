<template>
  <div class="pirate-identity">
    <label class="pirate-identity__field">
      <span class="pirate-identity__label">Ton nom de pirate</span>
      <input
        v-model="name"
        class="pirate-identity__input"
        type="text"
        maxlength="16"
        placeholder="Barbe-Rousse"
      />
    </label>

    <fieldset class="pirate-identity__field">
      <legend class="pirate-identity__label">Ton portrait</legend>
      <div class="pirate-identity__avatars">
        <button
          v-for="face in avatars"
          :key="face.src"
          v-click-sound
          class="pirate-identity__avatar"
          :class="{ 'pirate-identity__avatar--picked': face.src === avatar }"
          type="button"
          :aria-label="face.label"
          :aria-pressed="face.src === avatar"
          @click="avatar = face.src"
        >
          <img :src="face.src" alt="" class="pirate-identity__avatar-img" />
        </button>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
/**
 * Qui tu es à table : ton nom et ton portrait.
 *
 * Le bloc est le même en solo et en équipage — d'où deux `v-model` et aucune
 * connaissance du mode. Il ne sait pas non plus ce qu'on fera de ce pirate.
 */
const name = defineModel<string>('name', { required: true })
const avatar = defineModel<string>('avatar', { required: true })

const { avatars } = useAvatars()
</script>

<style scoped lang="scss">
.pirate-identity {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  // Le navigateur impose `min-inline-size: min-content` aux fieldset : sans
  // `min-width: 0`, la rangée de portraits refuserait de rétrécir.
  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  &__label {
    padding: 0;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 1.5rem;
    letter-spacing: 0.04em;
  }

  &__input {
    width: min(24rem, 100%);
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgba(201, 162, 39, 0.45);
    border-radius: var(--radius-btn);
    background: rgba(24, 14, 8, 0.45);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.15rem;

    &::placeholder {
      color: var(--text-dim);
      opacity: 0.6;
    }

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
  }

  &__avatars {
    display: flex;
    gap: var(--space-3);
    padding-bottom: var(--space-1);
    overflow-x: auto;
  }

  &__avatar {
    flex: 0 0 auto;
    width: 4.4rem;
    height: 4.4rem;
    padding: 0;
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    background: rgba(24, 14, 8, 0.45);
    transition:
      border-color 0.15s ease,
      transform 0.1s ease;

    &:hover {
      transform: translateY(-2px);
    }

    &--picked {
      border-color: var(--accent);
      background: rgba(201, 162, 39, 0.22);
    }
  }

  &__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
