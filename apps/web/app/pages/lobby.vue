<template>
  <main class="lobby">
    <div class="lobby__panel panel">
      <header class="lobby__header">
        <h1 class="lobby__title">Salle d'équipage</h1>
        <p class="lobby__code">
          Code de la partie
          <strong class="lobby__code-value mono">{{ roomCode }}</strong>
        </p>
      </header>

      <hr class="rope" />

      <!-- Réglages du capitaine -->
      <section class="lobby__settings">
        <label class="lobby__field">
          <span class="lobby__label">Ton nom de pirate</span>
          <input
            v-model="pseudo"
            class="lobby__input"
            type="text"
            maxlength="16"
            placeholder="Barbe-Rousse"
            @keyup.enter="addSelf"
          />
        </label>

        <button v-click-sound class="btn" type="button" :disabled="!canJoin" @click="addSelf">
          Rejoindre
        </button>

        <div class="lobby__field">
          <span class="lobby__label">Niveau des IA</span>
          <div class="lobby__diffs">
            <button
              v-for="d in DIFFICULTIES"
              :key="d.value"
              v-click-sound
              class="btn"
              :class="{ 'btn--ghost': difficulty !== d.value }"
              type="button"
              @click="difficulty = d.value"
            >
              {{ d.label }}
            </button>
          </div>
        </div>
      </section>

      <!-- Équipage : 5 sièges, remplis ou vides -->
      <ul class="lobby__crew">
        <li v-for="(seat, i) in seats" :key="i" class="lobby__seat">
          <template v-if="seat">
            <span class="lobby__seat-name">{{ seat.name }}</span>
            <span v-if="seat.bot" class="lobby__seat-tag mono">IA</span>
            <span
              class="lobby__seat-state"
              :class="{ 'lobby__seat-state--ready': seat.ready }"
            >{{ seat.ready ? 'Paré' : 'En attente' }}</span>
            <button
              v-if="!seat.bot"
              v-click-sound
              class="btn btn--ghost lobby__seat-action"
              type="button"
              @click="toggleReady(i)"
            >
              {{ seat.ready ? 'Annuler' : 'Je suis paré' }}
            </button>
            <button
              v-else
              v-click-sound
              class="btn btn--ghost lobby__seat-action"
              type="button"
              @click="removeSeat(i)"
            >
              Retirer
            </button>
          </template>
          <template v-else>
            <span class="lobby__seat-empty">Siège libre</span>
            <button v-click-sound class="btn btn--ghost lobby__seat-action" type="button" @click="addBot">
              Ajouter une IA
            </button>
          </template>
        </li>
      </ul>

      <p class="lobby__hint">{{ hint }}</p>

      <footer class="lobby__footer">
        <NuxtLink v-click-sound to="/" class="btn btn--ghost">Retour</NuxtLink>
        <button v-click-sound class="btn" type="button" :disabled="!canStart" @click="startGame">
          Lever l'ancre
        </button>
      </footer>

      <p class="lobby__notice">
        Le multijoueur en ligne arrive avec le serveur temps réel. Pour l'instant,
        cette salle prépare une partie locale : ajoute des IA et lance.
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
/**
 * Salle d'attente. Pour l'instant purement locale : elle compose la table
 * (joueurs humains sur ce poste + IA) avant de lancer la partie.
 * Elle sera branchée sur le serveur WebSocket autoritaire en phase 4 — la forme
 * de l'état (sièges, « paré », capitaine) est déjà celle qu'il diffusera.
 */
import type { BotDifficulty } from '@rf/engine'

const MAX_SEATS = 5
const MIN_PLAYERS = 2

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' }
]

interface Seat {
  name: string
  bot: boolean
  ready: boolean
}

const router = useRouter()
const tableSetup = useTableSetup()
const difficulty = ref<BotDifficulty>('medium')

const pseudo = ref('')
const seats = ref<(Seat | null)[]>(Array.from({ length: MAX_SEATS }, () => null))

/** Code de partie factice, remplacé par celui du serveur le moment venu. */
const roomCode = ref(
  Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
)

const filled = computed(() => seats.value.filter((s): s is Seat => s !== null))
const humans = computed(() => filled.value.filter(s => !s.bot))
const canJoin = computed(() => pseudo.value.trim().length > 0 && filled.value.length < MAX_SEATS)
const canStart = computed(
  () => filled.value.length >= MIN_PLAYERS && humans.value.length > 0 && humans.value.every(s => s.ready)
)

const hint = computed(function buildHint() {
  if (filled.value.length < MIN_PLAYERS) return `Il faut au moins ${MIN_PLAYERS} pirates à bord.`
  if (humans.value.length === 0) return 'Rejoins la table avant de lever l’ancre.'
  if (!humans.value.every(s => s.ready)) return 'Tout l’équipage doit se déclarer paré.'
  return 'L’équipage est au complet — en route !'
})

function firstFreeSeat(): number {
  return seats.value.findIndex(s => s === null)
}

function addSelf(): void {
  const name = pseudo.value.trim()
  if (!name) return
  const i = firstFreeSeat()
  if (i === -1) return
  seats.value[i] = { name, bot: false, ready: false }
  seats.value = [...seats.value]
  pseudo.value = ''
}

function addBot(): void {
  const i = firstFreeSeat()
  if (i === -1) return
  const n = filled.value.filter(s => s.bot).length + 1
  seats.value[i] = { name: `Corsaire ${n}`, bot: true, ready: true }
  seats.value = [...seats.value]
}

function removeSeat(index: number): void {
  seats.value[index] = null
  seats.value = [...seats.value]
}

function toggleReady(index: number): void {
  const seat = seats.value[index]
  if (!seat) return
  seats.value[index] = { ...seat, ready: !seat.ready }
  seats.value = [...seats.value]
}

/** Transmet la table composée à la partie, puis y navigue. */
function startGame(): void {
  if (!canStart.value) return
  tableSetup.value = {
    difficulty: difficulty.value,
    roster: filled.value.map((seat, i) => ({
      id: `p${i}`,
      name: seat.name,
      bot: seat.bot
    }))
  }
  router.push('/solo')
}
</script>

<style scoped lang="scss">
.lobby {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: var(--space-4);

  &__panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: min(680px, 100%);
  }

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }

  &__title {
    color: var(--accent);
    font-size: var(--fs-display-m);
  }

  &__code {
    color: var(--text-dim);
    font-size: var(--fs-body-s);
  }

  &__code-value {
    margin-left: var(--space-2);
    color: var(--accent);
    letter-spacing: 0.2em;
  }

  &__settings {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-3);
  }

  &__field {
    display: flex;
    flex: 1 1 14rem;
    flex-direction: column;
    gap: var(--space-1);
  }

  &__label {
    color: var(--text-dim);
    font-size: var(--fs-body-s);
  }

  &__input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-btn);
    background: var(--surface-2);
    color: var(--text);
    font-family: var(--font-body);
  }

  &__crew {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__seat {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgba(201, 162, 39, 0.35);
    border-radius: var(--radius-btn);
    background: var(--surface-2);
  }

  &__seat-name {
    flex: 1;
    font-weight: 600;
  }

  &__seat-tag {
    color: var(--text-dim);
    font-size: var(--fs-body-s);
  }

  &__seat-state {
    color: var(--text-dim);
    font-size: var(--fs-body-s);

    &--ready {
      color: var(--success);
    }
  }

  &__seat-empty {
    flex: 1;
    color: var(--text-dim);
    font-style: italic;
  }

  &__seat-action {
    font-size: var(--fs-body-s);
  }

  &__hint {
    color: var(--text-dim);
    font-size: var(--fs-body-s);
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
  }

  &__notice {
    color: var(--text-dim);
    font-size: var(--fs-body-s);
    opacity: 0.75;
  }
}
</style>
