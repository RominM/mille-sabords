<template>
  <Modal title="Fin de la partie">
    <div class="over">
      <p class="over__winner">🏆 {{ winner?.name ?? '—' }} l’emporte !</p>

      <ol class="over__ranking">
        <li v-for="(p, i) in ranking" :key="p.id" class="over__row" :class="{ 'over__row--first': i === 0 }">
          <span class="over__rank">{{ i + 1 }}</span>
          <img v-if="avatarOf(p.id)" :src="avatarOf(p.id)" alt="" class="over__avatar" />
          <span class="over__name">{{ p.name }}</span>
          <span class="over__score">{{ p.score }} pts</span>
        </li>
      </ol>

      <div class="over__actions">
        <button v-click-sound class="btn" type="button" @click="emit('replay')">Rejouer</button>
        <button v-click-sound class="btn btn--ghost" type="button" @click="emit('menu')">
          Retour au menu
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Écran de fin : le classement complet, puis les deux issues possibles.
 * Le composant ne décide de rien — il émet, l'appelant relance ou navigue.
 */
import type { Player } from '@rf/engine'

const props = defineProps<{
  players: Player[]
  winner: Player | null
  avatarOf: (id: string) => string | undefined
}>()

const emit = defineEmits<{ replay: []; menu: [] }>()

/** Classement décroissant : on ne fait pas chercher le vainqueur des yeux. */
const ranking = computed(() => [...props.players].sort((a, b) => b.score - a.score))
</script>

<style scoped lang="scss">
$ink: #2a1c0e;

.over {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: $ink;
  font-family: var(--font-body);

  &__winner {
    font-family: var(--font-display);
    font-size: 1.9rem;
    text-align: center;
  }

  &__ranking {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 1.1rem;

    &--first {
      font-weight: 700;
    }
  }

  &__rank {
    width: 1.5rem;
    font-family: var(--font-mono);
  }

  &__avatar {
    width: 2.2rem;
    height: 2.2rem;
    object-fit: contain;
  }

  &__name {
    flex: 1;
  }

  &__score {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
    margin-top: var(--space-2);
  }
}
</style>
