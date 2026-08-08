<template>
  <SidePanel label="Historique" title="Tours joués" :tab-top="58">
    <p v-if="!entries.length" class="log__empty">Aucun tour joué pour l’instant.</p>

    <ol v-else class="log__list">
      <li v-for="entry in entries" :key="entry.rank" class="log__row">
        <span class="log__rank">{{ entry.rank }}</span>
        <span class="log__who">
          {{ entry.name }}
          <small class="log__why">{{ entry.why }}</small>
        </span>
        <span class="log__score" :class="`log__score--${entry.sign}`">{{ entry.points }}</span>
      </li>
    </ol>
  </SidePanel>
</template>

<script setup lang="ts">
/**
 * Historique des tours, en tiroir sous le barème.
 *
 * Il répond à une question que le plateau ne sait pas poser : « pourquoi
 * viens-je de perdre ? ». Le score seul ne le dit pas — trois têtes, une île,
 * un défi manqué et un minuteur expiré donnent tous zéro ou moins.
 *
 * L'historique vient du MOTEUR, pas d'un cumul local : en multijoueur, tout le
 * monde doit lire la même chose, et un rechargement ne doit rien effacer.
 */
import type { Player, TurnRecord } from '@rf/engine'

const props = defineProps<{ history: TurnRecord[]; players: Player[] }>()

/** Ce que raconte la fin d'un tour, en trois mots. */
const WHY: Record<TurnRecord['reason'], string> = {
  stopped: '',
  'three-skulls': 'trois têtes',
  'skull-island': 'île de la Tête-de-Mort',
  timeout: 'temps écoulé'
}

const entries = computed(() =>
  props.history
    .map((record, i) => ({
      // L'historique arrive du plus ancien au plus récent : le rang suit cet
      // ordre-là, pas l'ordre d'affichage. Sans quoi le tour qu'on vient de
      // jouer porterait le numéro 1.
      rank: i + 1,
      name: props.players.find((p) => p.id === record.playerId)?.name ?? '—',
      why:
        record.opponentPenalty > 0
          ? `${WHY[record.reason]} — chacun perd ${record.opponentPenalty}`
          : WHY[record.reason],
      points: record.score >= 0 ? `+${record.score}` : `${record.score}`,
      sign: record.score > 0 ? 'pos' : record.score < 0 ? 'neg' : 'zero'
    }))
    // Le plus récent en tête : c'est celui qu'on vient de vivre et qu'on
    // cherche à comprendre.
    .reverse()
)
</script>

<style scoped lang="scss">
.log {
  &__empty {
    color: var(--text-dim);
    font-size: 0.9rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    padding-bottom: var(--space-1);
    border-bottom: 1px solid rgba(201, 162, 39, 0.18);
    font-size: 0.9rem;
  }

  &__rank {
    min-width: 1.6em;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }

  // Le nom pousse les points contre le bord droit : la colonne de chiffres
  // reste alignée, on lit la partie d'un coup d'œil.
  &__who {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  &__why {
    color: var(--text-dim);
    font-size: 0.75rem;
    line-height: 1.2;
  }

  &__score {
    font-family: var(--font-mono);
    font-weight: 600;

    &--pos {
      color: var(--accent);
    }

    &--neg {
      color: var(--danger-edge);
    }

    &--zero {
      color: var(--text-dim);
    }
  }
}
</style>
