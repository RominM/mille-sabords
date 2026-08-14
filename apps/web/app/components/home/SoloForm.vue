<template>
  <EmbarkForm class="solo-form" :disabled="!canStart" :hint="hint" @submit="start">
    <PirateIdentity v-model:name="name" v-model:avatar="avatar" />

    <fieldset class="solo-form__field">
      <legend class="solo-form__label">Niveau du Corsaire</legend>
      <div class="solo-form__choices">
        <button
          v-for="level in DIFFICULTIES"
          :key="level.value"
          v-click-sound
          class="btn solo-form__choice"
          :class="{ 'btn--ghost': level.value !== difficulty }"
          type="button"
          :aria-pressed="level.value === difficulty"
          @click="difficulty = level.value"
        >
          {{ level.label }}
        </button>
      </div>
    </fieldset>

    <label class="solo-form__tutorial">
      <input v-model="tutorial" class="solo-form__check" type="checkbox" />
      <span>Activer le tutoriel</span>
    </label>
  </EmbarkForm>
</template>

<script setup lang="ts">
/**
 * Mise en place d'une partie solo, à même le panneau de l'accueil.
 *
 * Le formulaire compose la table et part sur le plateau : « Embarquer » n'ouvre
 * plus une étape de plus, il lance la partie. C'est le pendant de « Lever
 * l'ancre » du lobby, qui fait la même chose pour le multi.
 */
import type { BotDifficulty } from '@rf/engine'

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' }
]

const router = useRouter()
const tableSetup = useTableSetup()
const { defaultAvatar } = useAvatars()

// Pré-rempli avec la dernière table jouée : on ne se resaisit pas à chaque partie.
const previous = lastSoloSetup()
const you = previous?.roster.find((seat) => !seat.bot)

const name = ref(you?.name ?? '')
const avatar = ref(you?.avatar ?? defaultAvatar)
const difficulty = ref<BotDifficulty>(previous?.difficulty ?? 'medium')
/**
 * La case existe, RIEN ne la suit encore : le tutoriel reste à écrire, et son
 * choix n'est donc ni transmis à la table ni mémorisé. Volontaire — la case
 * pose la place que prendra la fonction, sans en préjuger la forme.
 */
const tutorial = ref(false)

const canStart = computed(() => name.value.trim().length > 0)
const hint = computed(() => (canStart.value ? '' : 'Choisis un nom pour embarquer.'))

function start(): void {
  const setup = {
    difficulty: difficulty.value,
    roster: [
      { id: 'you', name: name.value.trim(), bot: false, avatar: avatar.value },
      { id: 'bot', name: 'Le Corsaire', bot: true }
    ]
  }

  tableSetup.value = setup
  rememberSoloSetup(setup)
  router.push('/game?mode=solo')
}
</script>

<style scoped lang="scss">
.solo-form {
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

  &__choices {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  &__choice {
    padding: var(--space-2) var(--space-4);
    font-size: 1.05rem;
  }

  &__tutorial {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.1rem;
  }

  &__check {
    width: 1.3rem;
    height: 1.3rem;
    accent-color: var(--accent);
  }
}
</style>
