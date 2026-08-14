<template>
  <EmbarkForm
    class="crew-form"
    :disabled="!canEmbark"
    :label="cta"
    :hint="hint"
    :error="error"
    @submit="embark"
  >
    <PirateIdentity v-model:name="name" v-model:avatar="avatar" />

    <fieldset class="crew-form__field">
      <legend class="crew-form__label">Le code de l’équipage</legend>

      <div class="crew-form__ways">
        <input
          v-model="code"
          class="crew-form__code"
          type="text"
          :maxlength="ROOM_CODE_LENGTH"
          placeholder="CODE"
          autocapitalize="characters"
          spellcheck="false"
          aria-label="Code de l’équipage"
          @input="hosting = false"
        />

        <button
          v-click-sound
          class="btn btn--ghost crew-form__generate"
          type="button"
          @click="generate"
        >
          Générer un code
        </button>
      </div>

      <p class="crew-form__note">{{ note }}</p>
    </fieldset>
  </EmbarkForm>
</template>

<script setup lang="ts">
/**
 * Entrée en équipage, à même le panneau de l'accueil : qui tu es, puis le code.
 *
 * Un seul code, deux rôles — on le TIRE (on ouvre l'équipage, on l'annonce à
 * ses amis) ou on le SAISIT (on rejoint le leur). Pas de bouton pour choisir
 * entre les deux : le geste suffit à dire lequel, et l'action finale se
 * renomme en conséquence.
 *
 * Le composant ne connaît pas le réseau : il rend un pirate et une intention.
 * C'est la page qui ouvre la connexion, elle seule sait quand la salle existe.
 */
import { ROOM_CODE_LENGTH, makeRoomCode } from '@rf/protocol'
import type { Pirate } from '~/composables/net/useRoom'

defineProps({
  /** Refus du serveur sur la tentative précédente (code inconnu, salle pleine…). */
  error: { type: String, default: '' }
})

const emit = defineEmits<{ embark: [pirate: Pirate, code: string, hosting: boolean] }>()

const { defaultAvatar } = useAvatars()

// Pré-rempli avec le dernier pirate connu : on ne se resaisit pas à chaque fois.
const previous = lastRoom()
const name = ref(previous?.name ?? '')
const avatar = ref(previous?.avatar ?? defaultAvatar)
const code = ref('')
/** Le code affiché vient-il d'ici ? C'est ce qui fait de toi l'hôte. */
const hosting = ref(false)

const named = computed(() => name.value.trim().length > 0)
const coded = computed(() => code.value.trim().length === ROOM_CODE_LENGTH)
const canEmbark = computed(() => named.value && coded.value)

/**
 * L'action dit ce qu'elle fait : on ne « rejoint » que le code d'un autre.
 * Tant qu'aucun code n'est posé, elle garde le mot neutre de l'accueil.
 */
const cta = computed(() => (coded.value && !hosting.value ? 'Rejoindre' : 'Embarquer'))

const hint = computed(() => {
  if (!named.value) return 'Choisis un nom pour embarquer.'
  if (!coded.value) return `Génère un code, ou saisis les ${ROOM_CODE_LENGTH} lettres de celui d’un ami.`
  return ''
})

const note = computed(() => {
  if (hosting.value) return 'Ce code est le tien : donne-le à ton équipage pour qu’il te rejoigne.'
  if (coded.value) return 'Tu rejoindras l’équipage de ce code.'
  return 'Génère-le pour ouvrir ton équipage, ou saisis celui qu’on t’a donné.'
})

function generate(): void {
  code.value = makeRoomCode()
  hosting.value = true
}

function embark(): void {
  const pirate: Pirate = { name: name.value.trim(), avatar: avatar.value }
  emit('embark', pirate, code.value.trim().toUpperCase(), hosting.value)
}
</script>

<style scoped lang="scss">
.crew-form {
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
    font-size: 1.35rem;
    letter-spacing: 0.04em;
  }

  &__ways {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3);
  }

  &__generate {
    padding: var(--space-2) var(--space-4);
    font-size: 1.05rem;
  }

  &__note {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
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
