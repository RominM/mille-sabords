<template>
  <Modal size="sm" show-cross title="Ton pirate" @close="emit('close')">
    <form class="seat-setup" @submit.prevent="confirm">
      <label class="seat-setup__field">
        <span class="seat-setup__label">Ton nom de pirate</span>
        <input
          v-model="name"
          class="seat-setup__input"
          type="text"
          maxlength="16"
          placeholder="Barbe-Rousse"
          autofocus
        />
      </label>

      <fieldset class="seat-setup__field">
        <legend class="seat-setup__label">Ton portrait</legend>
        <div class="seat-setup__avatars">
          <button
            v-for="face in avatars"
            :key="face.src"
            v-click-sound
            class="seat-setup__avatar"
            :class="{ 'seat-setup__avatar--picked': face.src === avatar }"
            type="button"
            :aria-label="face.label"
            :aria-pressed="face.src === avatar"
            @click="avatar = face.src"
          >
            <img :src="face.src" alt="" class="seat-setup__avatar-img" />
          </button>
        </div>
      </fieldset>

      <p v-if="!canConfirm" class="seat-setup__hint">Choisis un nom pour embarquer.</p>

      <button v-click-sound class="btn seat-setup__submit" type="submit" :disabled="!canConfirm">
        Rejoindre l’équipage
      </button>
    </form>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Prise d'un siège au lobby : nom et portrait.
 *
 * Ne connaît ni la table ni la difficulté — il rend un pirate, le lobby décide
 * quoi en faire. C'est ce qui permettra de le réutiliser tel quel quand un
 * joueur distant prendra un siège via le serveur.
 */
const props = defineProps<{ name?: string; avatar?: string }>()
const emit = defineEmits<{ close: []; confirm: [pirate: { name: string; avatar: string }] }>()

const { avatars, defaultAvatar } = useAvatars()

const name = ref(props.name ?? '')
const avatar = ref(props.avatar ?? defaultAvatar)

const canConfirm = computed(() => name.value.trim().length > 0)

function confirm(): void {
  if (!canConfirm.value) return
  emit('confirm', { name: name.value.trim(), avatar: avatar.value })
}
</script>

<style scoped lang="scss">
$ink: #2a1c0e;

.seat-setup {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  text-align: left;

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }

  &__label {
    padding: 0;
    color: $ink;
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 600;
  }

  &__input {
    width: 100%;
    padding: var(--space-2);
    border: 1px solid rgba(42, 28, 14, 0.45);
    border-radius: var(--radius-btn);
    background: rgba(255, 250, 235, 0.55);
    color: $ink;
    font-family: var(--font-body);
    font-size: 1.05rem;

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
  }

  &__avatars {
    display: flex;
    gap: var(--space-2);
    padding-bottom: var(--space-1);
    overflow-x: auto;
  }

  &__avatar {
    flex: 0 0 auto;
    width: 3.6rem;
    height: 3.6rem;
    padding: 0;
    border: 2px solid transparent;
    border-radius: var(--radius-btn);
    background: rgba(42, 28, 14, 0.08);
    cursor: pointer;
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

  &__hint {
    color: $ink;
    font-family: var(--font-body);
    font-size: 0.9rem;
    opacity: 0.75;
  }

  &__submit {
    align-self: center;
    padding: var(--space-2) var(--space-4);
    font-size: 1.05rem;
  }
}
</style>
