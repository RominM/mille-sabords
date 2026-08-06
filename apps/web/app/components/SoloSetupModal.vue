<template>
  <Modal show-cross title="Contre le Corsaire" @close="emit('close')">
    <form class="solo-setup" @submit.prevent="start">
      <label class="solo-setup__field">
        <span class="solo-setup__label">Ton nom de pirate</span>
        <input
          v-model="name"
          class="solo-setup__input"
          type="text"
          maxlength="16"
          placeholder="Barbe-Rousse"
          autofocus
        />
      </label>

      <fieldset class="solo-setup__field">
        <legend class="solo-setup__label">Ton portrait</legend>
        <div class="solo-setup__avatars">
          <button
            v-for="face in AVATARS"
            :key="face.src"
            v-click-sound
            class="solo-setup__avatar"
            :class="{ 'solo-setup__avatar--picked': face.src === avatar }"
            type="button"
            :aria-label="face.label"
            :aria-pressed="face.src === avatar"
            @click="avatar = face.src"
          >
            <img :src="face.src" alt="" class="solo-setup__avatar-img" />
          </button>
        </div>
      </fieldset>

      <fieldset class="solo-setup__field">
        <legend class="solo-setup__label">Niveau du Corsaire</legend>
        <div class="solo-setup__diffs">
          <button
            v-for="d in DIFFICULTIES"
            :key="d.value"
            v-click-sound
            class="btn solo-setup__diff"
            :class="{ 'btn--ghost': d.value !== difficulty }"
            type="button"
            :aria-pressed="d.value === difficulty"
            @click="difficulty = d.value"
          >
            {{ d.label }}
          </button>
        </div>
      </fieldset>

      <p v-if="!canStart" class="solo-setup__hint">Choisis un nom pour embarquer.</p>

      <button v-click-sound class="btn solo-setup__submit" type="submit" :disabled="!canStart">
        Commencer la partie
      </button>
    </form>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Mise en place d'une partie solo : nom, portrait, niveau de l'IA.
 *
 * Le composant compose la table et navigue lui-même vers le plateau — c'est le
 * pendant de « Lever l'ancre » du lobby, qui fait exactement la même chose pour
 * le multi. La forme déposée dans `useTableSetup` est la même dans les deux cas.
 */
import type { BotDifficulty } from '@rf/engine'
import darkPirate from '~/assets/images/character/chara_dark-pirate.webp'
import oldPirate from '~/assets/images/character/chara_old-pirate.webp'
import pirate from '~/assets/images/character/chara_pirate.webp'
import youngMan from '~/assets/images/character/chara_men-young.webp'
import youngWoman from '~/assets/images/character/chara_women-young.webp'

const emit = defineEmits<{ close: [] }>()

// `chara_bot` est réservé au Corsaire : on ne le propose pas au joueur.
const AVATARS: { src: string; label: string }[] = [
  { src: pirate, label: 'Pirate' },
  { src: darkPirate, label: 'Pirate sombre' },
  { src: oldPirate, label: 'Vieux loup de mer' },
  { src: youngMan, label: 'Jeune moussaillon' },
  { src: youngWoman, label: 'Jeune moussaillonne' }
]

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' }
]

const router = useRouter()
const tableSetup = useTableSetup()

const name = ref('')
const avatar = ref(AVATARS[0]!.src)
const difficulty = ref<BotDifficulty>('medium')

const canStart = computed(() => name.value.trim().length > 0)

function start(): void {
  if (!canStart.value) return
  tableSetup.value = {
    difficulty: difficulty.value,
    roster: [
      { id: 'you', name: name.value.trim(), bot: false, avatar: avatar.value },
      { id: 'bot', name: 'Le Corsaire', bot: true }
    ]
  }
  router.push('/game?mode=solo')
}
</script>

<style scoped lang="scss">
// Le parchemin est clair : tout le texte de cette modale doit être sombre.
$ink: #2a1c0e;

.solo-setup {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  text-align: left;

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
  }

  &__label {
    padding: 0;
    color: $ink;
    font-family: var(--font-body);
    font-size: 1.15rem;
    font-weight: 600;
  }

  &__input {
    width: 100%;
    padding: var(--space-3);
    border: 1px solid rgba(42, 28, 14, 0.45);
    border-radius: var(--radius-btn);
    background: rgba(255, 250, 235, 0.55);
    color: $ink;
    font-family: var(--font-body);
    font-size: 1.25rem;

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
  }

  // Les portraits ne se replient pas : ils défilent horizontalement plutôt que
  // de rétrécir, pour rester lisibles.
  &__avatars {
    display: flex;
    gap: var(--space-3);
    padding-bottom: var(--space-1);
    overflow-x: auto;
  }

  &__avatar {
    flex: 0 0 auto;
    width: 5.5rem;
    height: 5.5rem;
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

    // L'or signale le choix retenu, comme partout ailleurs dans le jeu.
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

  &__diffs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  &__diff {
    padding: var(--space-2) var(--space-4);
    font-size: 1.1rem;
  }

  &__hint {
    color: $ink;
    font-family: var(--font-body);
    font-size: 1rem;
    opacity: 0.75;
  }

  &__submit {
    align-self: center;
    margin-top: var(--space-2);
    padding: var(--space-3) var(--space-5);
    font-size: 1.25rem;
  }
}
</style>
