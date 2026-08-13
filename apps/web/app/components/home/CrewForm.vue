<template>
  <EmbarkForm class="crew-form" :disabled="!canEmbark" :hint="hint" :error="error" @submit="embark">
    <p class="crew-form__pitch">Crée un équipage ou rejoins celui d’un ami, et que le meilleur gagne.</p>

    <PirateIdentity v-model:name="name" v-model:avatar="avatar" />

    <fieldset class="crew-form__field">
      <legend class="crew-form__label">Ton équipage</legend>
      <div class="crew-form__choices">
        <button
          v-for="way in WAYS"
          :key="way.value"
          v-click-sound
          class="btn crew-form__choice"
          :class="{ 'btn--ghost': way.value !== intent }"
          type="button"
          :aria-pressed="way.value === intent"
          @click="intent = way.value"
        >
          {{ way.label }}
        </button>

        <input
          v-if="intent === 'join'"
          v-model="code"
          class="crew-form__code"
          type="text"
          maxlength="4"
          placeholder="CODE"
          autocapitalize="characters"
          spellcheck="false"
          aria-label="Code de la partie"
        />
      </div>
    </fieldset>
  </EmbarkForm>
</template>

<script setup lang="ts">
/**
 * Entrée en équipage, à même le panneau de l'accueil : qui tu es, puis créer ou
 * rejoindre. L'ancienne modale posait exactement les mêmes questions une étape
 * plus loin — et le lobby les reposait à qui arrivait par l'URL.
 *
 * Le composant ne connaît pas le réseau : il rend un pirate et une intention.
 * C'est la page qui ouvre la connexion, elle seule sait quand la salle existe.
 */
import type { Pirate } from '~/composables/net/useRoom'

type Intent = 'create' | 'join'

defineProps({
  /** Refus du serveur sur la tentative précédente (code inconnu, salle pleine…). */
  error: { type: String, default: '' }
})

const emit = defineEmits<{ embark: [pirate: Pirate, code?: string] }>()

const WAYS: { value: Intent; label: string }[] = [
  { value: 'create', label: 'Créer une partie' },
  { value: 'join', label: 'Rejoindre' }
]

const { defaultAvatar } = useAvatars()

// Pré-rempli avec le dernier pirate connu : on ne se resaisit pas à chaque fois.
const previous = lastRoom()
const name = ref(previous?.name ?? '')
const avatar = ref(previous?.avatar ?? defaultAvatar)
const intent = ref<Intent>('create')
const code = ref('')

const named = computed(() => name.value.trim().length > 0)
const coded = computed(() => code.value.trim().length >= 4)
const canEmbark = computed(() => named.value && (intent.value === 'create' || coded.value))

const hint = computed(() => {
  if (!named.value) return 'Choisis un nom pour embarquer.'
  if (intent.value === 'join' && !coded.value) return 'Saisis le code à 4 lettres de la partie.'
  return ''
})

function embark(): void {
  const pirate: Pirate = { name: name.value.trim(), avatar: avatar.value }
  emit('embark', pirate, intent.value === 'join' ? code.value.trim() : undefined)
}
</script>

<style scoped lang="scss">
.crew-form {
  &__pitch {
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.15rem;
  }

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
    align-items: center;
    gap: var(--space-3);
  }

  &__choice {
    padding: var(--space-2) var(--space-4);
    font-size: 1.05rem;
  }

  &__code {
    width: 7rem;
    padding: var(--space-2);
    border: 1px solid rgba(201, 162, 39, 0.45);
    border-radius: var(--radius-btn);
    background: rgba(24, 14, 8, 0.45);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 1.3rem;
    letter-spacing: 0.25em;
    text-align: center;
    text-transform: uppercase;

    &::placeholder {
      color: var(--text-dim);
      opacity: 0.6;
      letter-spacing: 0.15em;
    }

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
  }
}
</style>
