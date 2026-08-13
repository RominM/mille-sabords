<template>
  <main class="lobby" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <RoomEntry
      v-if="!room.connected.value"
      :error="room.error.value"
      @create="(pirate) => room.connect(pirate)"
      @join="(pirate, code) => room.connect(pirate, code)"
    />

    <div v-else class="lobby__grid">
      <h1 class="lobby__title">Salle d’équipage</h1>

      <div v-if="room.isHost.value" class="lobby__ai">
        <span class="lobby__ai-label">Niveau des IA</span>
        <div class="lobby__ai-choices">
          <button
            v-for="d in DIFFICULTIES"
            :key="d.value"
            v-click-sound
            class="btn lobby__ai-btn"
            :class="{ 'btn--ghost': lobby?.difficulty !== d.value }"
            type="button"
            :aria-pressed="lobby?.difficulty === d.value"
            @click="room.setDifficulty(d.value)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>

      <section class="lobby__crew" :style="{ backgroundImage: `url(${panelUrl})` }">
        <div class="lobby__code">
          <span class="lobby__code-label">Code de la partie</span>
          <strong class="lobby__code-value">{{ room.code.value }}</strong>
        </div>

        <ul class="crew">
          <li v-for="seat in lobby?.seats ?? []" :key="seat.id" class="crew__row">
            <img :src="seat.avatar || botAvatar" alt="" class="crew__avatar" />
            <span class="crew__name">
              {{ seat.name }}
              <span v-if="seat.id === lobby?.hostId" class="crew__tag">(hôte)</span>
              <span v-else-if="seat.bot" class="crew__tag">IA</span>
              <span v-if="!seat.connected" class="crew__tag">déconnecté</span>
            </span>

            <span v-if="!seat.ready" class="crew__loader">🛞</span>
            <span class="crew__state" :class="{ 'crew__state--ready': seat.ready }">
              {{ seat.ready ? 'Paré' : 'En attente' }}
            </span>

            <button
              v-if="seat.id === room.youId.value"
              v-click-sound
              class="btn btn--ghost crew__action"
              type="button"
              @click="room.setReady(!seat.ready)"
            >
              {{ seat.ready ? 'Annuler' : 'Je suis paré' }}
            </button>
            <button
              v-else-if="seat.bot && room.isHost.value"
              v-click-sound
              class="btn btn--ghost crew__action"
              type="button"
              @click="room.removeSeat(seat.id)"
            >
              Retirer
            </button>
          </li>

          <li v-if="room.isHost.value && (lobby?.seats.length ?? 0) < MAX_PLAYERS" class="crew__row">
            <button v-click-sound class="crew__empty" type="button" @click="room.addBot()">
              + Ajouter une IA
            </button>
          </li>
        </ul>
      </section>

      <NuxtLink v-click-sound to="/" class="lobby__back" @click="room.close()">← Retour</NuxtLink>

      <p class="lobby__hint" :class="{ 'lobby__hint--error': room.error.value }">
        {{ room.error.value || hint }}
      </p>

      <div class="lobby__start">
        <PlateButton v-if="room.isHost.value" :disabled="!canStart" @click="room.start()">
          Lever l’ancre
        </PlateButton>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
/**
 * Salle d'équipage, pilotée par le serveur.
 *
 * La page ne compose plus rien : elle affiche ce que le serveur diffuse et lui
 * renvoie des intentions. C'est ce qui fait que tous les joueurs voient la même
 * table au même instant, et qu'un invité arrive simplement en saisissant le code.
 */
import { MAX_PLAYERS, type BotDifficulty } from '@rf/engine'
import backgroundUrl from '~/assets/images/ui/captain-quartier.webp'
import panelUrl from '~/assets/images/ui/panel-menu.webp'

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' }
]

const router = useRouter()
const room = useRoom()
const { botAvatar } = useAvatars()

const lobby = room.lobby

const humans = computed(() => lobby.value?.seats.filter((s) => !s.bot) ?? [])
const canStart = computed(
  () => (lobby.value?.seats.length ?? 0) >= 2 && humans.value.length > 0 && humans.value.every((s) => s.ready)
)

const hint = computed(() => {
  if (!lobby.value) return ''
  if (lobby.value.seats.length < 2) return 'Partage le code : il faut au moins 2 pirates à bord.'
  if (!humans.value.every((s) => s.ready)) return 'Tout l’équipage doit se déclarer paré.'
  if (!room.isHost.value) return 'L’équipage est paré — l’hôte peut lever l’ancre.'
  return 'L’équipage est au complet — en route !'
})

/**
 * Le départ n'est pas décidé ici : le serveur l'annonce, et TOUS les joueurs
 * basculent ensemble. Attendre un clic de chacun les désynchroniserait.
 */
watch(
  () => room.status.value,
  (status) => {
    if (status === 'playing') router.push('/game?mode=multi')
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.lobby {
  min-height: 100dvh;
  padding: var(--space-3);
  display: grid;
  place-items: center;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;

  &__grid {
    width: min(1340px, 94vw, calc((96dvh - 12rem) * 1708 / 985));
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'title ai'
      'crew crew'
      'back start'
      'hint hint';
    align-items: center;
    gap: var(--space-3) var(--space-4);
  }

  &__title {
    grid-area: title;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 2.6rem;
    text-shadow: 0 2px 6px rgba(24, 14, 8, 0.9);
  }

  &__code {
    position: absolute;
    left: 34%;
    top: 13.1%;
    width: 30.8%;
    height: 21.1%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4cqh;
  }

  &__code-label {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 1.3cqw;
  }

  &__code-value {
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 3.4cqw;
    line-height: 1;
    letter-spacing: 0.22em;
    text-indent: 0.22em;
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

  &__crew {
    grid-area: crew;
    position: relative;
    aspect-ratio: 1708 / 985;
    container-type: size;
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

    &--error {
      color: var(--danger-edge);
      font-weight: 600;
    }
  }

  &__start {
    grid-area: start;
    justify-self: end;
  }
}

.crew {
  position: absolute;
  left: 6%;
  top: 40%;
  width: 88%;
  height: 52%;
  display: flex;
  flex-direction: column;
  gap: 1cqh;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;

  &__row {
    flex: 0 0 auto;
    height: 9.4cqh;
    display: flex;
    align-items: center;
    gap: 2cqw;
    padding: 0 1.5cqw;
    border: 1px solid rgba(201, 162, 39, 0.35);
    border-radius: 0.4cqw;
    background: rgba(24, 14, 8, 0.35);
  }

  &__avatar {
    width: 7cqh;
    height: 7cqh;
    border-radius: 50%;
    object-fit: cover;
    background: rgba(24, 14, 8, 0.5);
  }

  &__name {
    flex: 1;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1.5cqw;
  }

  &__tag {
    color: var(--text-dim);
    font-size: 1.1cqw;
  }

  &__loader {
    display: inline-block;
    animation: rotate 2s linear infinite;
  }

  &__state {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 1.2cqw;

    &--ready {
      color: var(--success);
    }
  }

  &__empty {
    flex: 1;
    padding: var(--space-2);
    border: 0;
    background: none;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: 1.4cqw;
    font-style: italic;
    text-align: left;
    cursor: pointer;

    &:hover {
      color: var(--accent);
    }
  }

  &__action {
    flex: 0 0 auto;
    padding: 0.6cqh 1.2cqw;
    font-size: 1.2cqw;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
