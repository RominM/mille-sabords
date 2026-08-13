<template>
  <!-- Rouleau COUCHÉ : nom, portraits et les deux chemins tiennent alors
       sans faire défiler le parchemin. -->
  <Modal size="wide" title="Rejoindre l’équipage">
    <!-- Deux colonnes : QUI tu es à gauche, COMMENT tu embarques à droite.
         C'est ce que le rouleau couché permet, et ce qui supprime le défilement. -->
    <div class="entry__cols">
    <label class="entry__field">
      <span class="entry__label">Ton nom de pirate</span>
      <input
        v-model="name"
        class="entry__input"
        type="text"
        maxlength="16"
        placeholder="Barbe-Rousse"
      />
    </label>

    <fieldset class="entry__field">
      <legend class="entry__label">Ton portrait</legend>
      <div class="entry__avatars">
        <button
          v-for="face in avatars"
          :key="face.src"
          v-click-sound
          class="entry__avatar"
          :class="{ 'entry__avatar--picked': face.src === avatar }"
          type="button"
          :aria-label="face.label"
          :aria-pressed="face.src === avatar"
          @click="avatar = face.src"
        >
          <img :src="face.src" alt="" class="entry__avatar-img" />
        </button>
      </div>
    </fieldset>

    <!-- Deux chemins, un seul écran : l'hôte crée et dicte le code, les autres
         le saisissent. Rien ne distingue les deux joueurs à ce stade. -->
    <div class="entry__ways">
      <button v-click-sound class="btn entry__btn" type="button" :disabled="!named" @click="create">
        Créer une partie
      </button>

      <div class="entry__join">
        <input
          v-model="code"
          class="entry__input entry__input--code"
          type="text"
          maxlength="4"
          placeholder="CODE"
          autocapitalize="characters"
          spellcheck="false"
          @keyup.enter="join"
        />
        <button
          v-click-sound
          class="btn btn--ghost entry__btn"
          type="button"
          :disabled="!named || code.trim().length < 4"
          @click="join"
        >
          Rejoindre
        </button>
      </div>
    </div>
    </div>

    <p v-if="!named" class="entry__hint">Choisis un nom pour embarquer.</p>
    <p v-if="error" class="entry__error">{{ error }}</p>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Entrée dans une salle : qui tu es, puis créer ou rejoindre.
 *
 * Le composant ne connaît pas le réseau — il rend un pirate et une intention.
 * C'est la page qui ouvre la connexion.
 */
import type { Pirate } from '~/composables/useRoom'

defineProps<{ error?: string }>()
const emit = defineEmits<{
  create: [pirate: Pirate]
  join: [pirate: Pirate, code: string]
}>()

const { avatars, defaultAvatar } = useAvatars()

// Pré-rempli avec le dernier pirate connu : on ne se resaisit pas à chaque fois.
const previous = lastRoom()
const name = ref(previous?.name ?? '')
const avatar = ref(previous?.avatar ?? defaultAvatar)
const code = ref('')

const named = computed(() => name.value.trim().length > 0)
const pirate = (): Pirate => ({ name: name.value.trim(), avatar: avatar.value })

function create(): void {
  if (named.value) emit('create', pirate())
}

function join(): void {
  if (named.value && code.value.trim().length >= 4) emit('join', pirate(), code.value.trim())
}
</script>

<style scoped lang="scss">
// Le parchemin est clair : tout le texte doit être sombre, et les champs
// posés dessus doivent s'éclaircir plutôt que de creuser un trou noir.
$ink: #2a1c0e;

.entry {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: $ink;

  // Deux colonnes dès qu'il y a la place — c'est le gain du rouleau couché.
  &__cols {
    display: grid;
    // 13rem : le seuil sous lequel une colonne ne tient plus ni un nom ni une
    // rangée de portraits. Au-dessus, le rouleau couché en loge deux.
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    gap: var(--space-4) var(--space-5);
    align-items: start;
  }

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 2rem;
    text-align: center;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0;
    // Le navigateur impose `min-inline-size: min-content` aux `fieldset` : sans
    // ça, la bande des portraits refuse de rétrécir et fait déborder le panneau.
    min-width: 0;
  }

  &__label {
    padding: 0;
    color: $ink;
    font-family: var(--font-body);
    font-weight: 600;
  }

  &__input {
    width: 100%;
    padding: var(--space-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-btn);
    background: rgba(255, 250, 235, 0.55);
    border-color: rgba(42, 28, 14, 0.45);
    color: $ink;
    font-family: var(--font-body);
    font-size: 1.05rem;

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }

    // Le code se dicte à l'oral : gros, espacé, en capitales.
    &--code {
      width: 7rem;
      font-family: var(--font-mono);
      font-size: 1.4rem;
      letter-spacing: 0.25em;
      text-align: center;
      text-transform: uppercase;
    }
  }

  // Les portraits défilent plutôt que de rétrécir : ils doivent rester lisibles.
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
    background: rgba(42, 28, 14, 0.12);
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

  &__rope {
    width: 100%;
  }

  &__ways {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__join {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  &__btn {
    justify-content: center;
    flex: 1;
  }

  &__hint {
    color: rgba(42, 28, 14, 0.75);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
    text-align: center;
  }

  &__error {
    color: #8c2f2f;
    font-family: var(--font-body);
    font-weight: 600;
    text-align: center;
  }
}
</style>
