<template>
  <main class="lobby" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <div class="lobby__grid">
      <h1 class="lobby__title">Salle d’équipage</h1>

      <!-- Le code n'est pas relégué : c'est lui qu'on dicte aux camarades. -->
      <div class="lobby__code">
        <span class="lobby__code-label">Code de la partie</span>
        <strong class="lobby__code-value">{{ roomCode }}</strong>
      </div>

      <!-- Réglage de partie, réservé à l'hôte : il ne concerne pas les invités. -->
      <div v-if="isHost" class="lobby__ai">
        <span class="lobby__ai-label">Niveau des IA</span>
        <div class="lobby__ai-choices">
          <button
            v-for="d in DIFFICULTIES"
            :key="d.value"
            v-click-sound
            class="btn lobby__ai-btn"
            :class="{ 'btn--ghost': difficulty !== d.value }"
            type="button"
            :aria-pressed="difficulty === d.value"
            @click="difficulty = d.value"
          >
            {{ d.label }}
          </button>
        </div>
      </div>

      <!-- Panneau des sièges, sur la planche du menu -->
      <section class="lobby__crew" :style="{ backgroundImage: `url(${panelUrl})` }">
        <ul class="crew">
          <li v-for="(seat, i) in seats" :key="i" class="crew__row">
            <template v-if="seat">
              <img :src="seat.avatar" alt="" class="crew__avatar" />
              <span class="crew__name">
                {{ seat.name }}
                <span v-if="seat.host" class="crew__tag">(hôte)</span>
                <span v-else-if="seat.bot" class="crew__tag">IA</span>
              </span>
              <span class="crew__state" :class="{ 'crew__state--ready': seat.ready }">
                {{ seat.bot ? 'Paré' : seat.ready ? 'Paré' : 'En attente' }}
              </span>
              <button
                v-if="!seat.bot"
                v-click-sound
                class="btn btn--ghost crew__action"
                type="button"
                @click="toggleReady(i)"
              >
                {{ seat.ready ? 'Annuler' : 'Je suis paré' }}
              </button>
              <button
                v-else
                v-click-sound
                class="btn btn--ghost crew__action"
                type="button"
                @click="removeSeat(i)"
              >
                Retirer
              </button>
            </template>

            <template v-else>
              <!-- Le siège libre est lui-même le bouton : cliquer dessus ouvre
                   la personnalisation, comme prévu au wireframe. -->
              <button v-click-sound class="crew__empty" type="button" @click="openSeat(i)">
                Siège libre — clique pour embarquer
              </button>
              <button
                v-click-sound
                class="btn btn--ghost crew__action"
                type="button"
                @click="addBot(i)"
              >
                + Ajouter IA
              </button>
            </template>
          </li>
        </ul>
      </section>

      <NuxtLink v-click-sound to="/" class="lobby__back">← Retour</NuxtLink>

      <p class="lobby__hint">{{ hint }}</p>

      <div class="lobby__start">
        <PlateButton :disabled="!canStart" @click="startGame">Lever l’ancre</PlateButton>
      </div>
    </div>

    <SeatSetupModal
      v-if="openSeatIndex !== null"
      @close="openSeatIndex = null"
      @confirm="takeSeat"
    />
  </main>
</template>

<script setup lang="ts">
/**
 * Salle d'équipage. Purement locale pour l'instant : elle compose la table
 * (joueurs sur ce poste + IA) avant de lancer la partie.
 *
 * La forme de l'état — sièges, « paré », hôte — est déjà celle que le serveur
 * WebSocket diffusera : seule la SOURCE changera, pas la structure.
 */
import type { BotDifficulty } from '@rf/engine'
import backgroundUrl from '~/assets/images/ui/captain-quartier.webp'
import panelUrl from '~/assets/images/ui/panel-menu.webp'

const MAX_SEATS = 5
const MIN_PLAYERS = 2

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' }
]

interface Seat {
  name: string
  avatar: string
  bot: boolean
  ready: boolean
  /** L'hôte règle la partie ; en local, c'est le premier humain assis. */
  host: boolean
}

const router = useRouter()
const tableSetup = useTableSetup()
const { botAvatar } = useAvatars()

const difficulty = ref<BotDifficulty>('medium')
const seats = ref<(Seat | null)[]>(Array.from({ length: MAX_SEATS }, () => null))
const openSeatIndex = ref<number | null>(null)

/** Code de partie factice, remplacé par celui du serveur le moment venu. */
const roomCode = ref(
  Array.from(
    { length: 4 },
    () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
)

const filled = computed(() => seats.value.filter((s): s is Seat => s !== null))
const humans = computed(() => filled.value.filter((s) => !s.bot))

/** En local, l'hôte existe dès qu'un humain s'est assis : c'est lui qui règle. */
const isHost = computed(() => humans.value.length > 0)

const canStart = computed(
  () =>
    filled.value.length >= MIN_PLAYERS &&
    humans.value.length > 0 &&
    humans.value.every((s) => s.ready)
)

const hint = computed(function buildHint() {
  if (filled.value.length < MIN_PLAYERS) return `Il faut au moins ${MIN_PLAYERS} pirates à bord.`
  if (humans.value.length === 0) return 'Prends un siège avant de lever l’ancre.'
  if (!humans.value.every((s) => s.ready)) return 'Tout l’équipage doit se déclarer paré.'
  return 'L’équipage est au complet — en route !'
})

function openSeat(index: number): void {
  openSeatIndex.value = index
}

function takeSeat(pirate: { name: string; avatar: string }): void {
  const i = openSeatIndex.value
  if (i === null) return
  seats.value[i] = {
    ...pirate,
    bot: false,
    ready: false,
    // Le premier humain assis devient l'hôte.
    host: humans.value.length === 0
  }
  seats.value = [...seats.value]
  openSeatIndex.value = null
}

function addBot(index: number): void {
  const n = filled.value.filter((s) => s.bot).length + 1
  seats.value[index] = {
    name: `Corsaire ${n}`,
    avatar: botAvatar,
    bot: true,
    ready: true,
    host: false
  }
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
      bot: seat.bot,
      avatar: seat.avatar
    }))
  }
  router.push('/game?mode=multi')
}
</script>

<style scoped lang="scss">
.lobby {
  min-height: 100dvh;
  padding: var(--space-4);
  display: grid;
  place-items: center;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;

  // Trame du wireframe : titre à gauche, code au centre, réglage IA à droite,
  // le panneau des sièges en pleine largeur, puis retour et CTA en pied.
  &__grid {
    width: min(1500px, 100%);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    grid-template-areas:
      'title code ai'
      'crew crew crew'
      'back hint start';
    align-items: center;
    gap: var(--space-4);
  }

  &__title {
    grid-area: title;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 2.6rem;
    text-shadow: 0 2px 6px rgba(24, 14, 8, 0.9);
  }

  // L'asset d'étiquette n'existe pas encore : rendu neutre aux tokens, à
  // remplacer par l'image le moment venu sans toucher à la structure.
  &__code {
    grid-area: code;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-5);
    border: 2px solid var(--accent);
    border-radius: var(--radius-btn);
    background: rgba(24, 14, 8, 0.65);
  }

  &__code-label {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 0.9rem;
  }

  &__code-value {
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 2rem;
    letter-spacing: 0.28em;
    // La lettre-espacement décale le texte vers la droite : on compense.
    text-indent: 0.28em;
  }

  &__ai {
    grid-area: ai;
    justify-self: end;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
  }

  &__ai-label {
    color: var(--text);
    font-family: var(--font-body);
    text-shadow: 0 2px 6px rgba(24, 14, 8, 0.9);
  }

  &__ai-choices {
    display: flex;
    gap: var(--space-2);
  }

  &__ai-btn {
    font-size: 0.95rem;
  }

  // La planche du menu, étirée : le ratio d'origine ne tient pas sur une zone
  // aussi large, mais c'est une texture — l'étirement ne se lit pas.
  &__crew {
    grid-area: crew;
    padding: var(--space-5) var(--space-6);
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
  }

  &__back {
    grid-area: back;
    justify-self: start;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 1.05rem;
    text-decoration: none;
    text-shadow: 0 2px 6px rgba(24, 14, 8, 0.9);

    &:hover {
      color: var(--accent);
    }
  }

  &__hint {
    grid-area: hint;
    color: var(--text);
    font-family: var(--font-body);
    text-align: center;
    text-shadow: 0 2px 6px rgba(24, 14, 8, 0.9);
  }

  &__start {
    grid-area: start;
    justify-self: end;
  }
}

.crew {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: 4.5rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgba(201, 162, 39, 0.35);
    border-radius: var(--radius-btn);
    background: rgba(24, 14, 8, 0.35);
  }

  &__avatar {
    width: 3.4rem;
    height: 3.4rem;
    border-radius: 50%;
    object-fit: cover;
    background: rgba(24, 14, 8, 0.5);
  }

  &__name {
    flex: 1;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.25rem;
  }

  &__tag {
    color: var(--text-dim);
    font-size: 0.9rem;
  }

  &__state {
    color: var(--text-dim);
    font-family: var(--font-body);

    &--ready {
      color: var(--success);
    }
  }

  // Le siège vide occupe toute la ligne : c'est une cible de clic, pas un label.
  &__empty {
    flex: 1;
    padding: var(--space-2);
    border: 0;
    background: none;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 1.1rem;
    font-style: italic;
    text-align: left;
    cursor: pointer;

    &:hover {
      color: var(--accent);
    }
  }

  &__action {
    flex: 0 0 auto;
  }
}
</style>
