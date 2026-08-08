<template>
  <SidePanel label="Historique" title="Tours joués" :top="73">
    <p v-if="!entries.length" class="log__empty">Aucun tour joué pour l’instant.</p>

    <ol v-else class="log__list">
      <li v-for="entry in entries" :key="entry.rank" class="log__item">
        <button
          v-click-sound
          type="button"
          class="log__row"
          :aria-expanded="open === entry.rank"
          @click="open = open === entry.rank ? null : entry.rank"
        >
          <span class="log__rank">{{ entry.rank }}</span>
          <span class="log__who">
            {{ entry.name }}
            <small v-if="entry.why" class="log__why">{{ entry.why }}</small>
          </span>
          <span class="log__score" :class="`log__score--${entry.sign}`">{{ entry.total }}</span>
        </button>

        <!-- Le décompte, replié par défaut : douze tours dépliés ne se lisent
             plus. Le dernier joué s'ouvre seul, c'est celui qu'on cherche. -->
        <ul v-if="open === entry.rank && entry.lines.length" class="log__detail">
          <li v-for="(line, i) in entry.lines" :key="i" class="log__line">
            <img v-if="line.icon" :src="line.icon" alt="" class="log__icon" />
            <span class="log__label">{{ line.label }}</span>
            <span class="log__points">{{ signed(line.points) }}</span>
          </li>
          <li v-if="entry.doubled" class="log__line log__line--note">
            <span class="log__label">Carte Pirate — points doublés</span>
            <span class="log__points">×2</span>
          </li>
          <li v-if="entry.penalty" class="log__line log__line--note">
            <span class="log__label">Chaque adversaire perd</span>
            <span class="log__points">{{ entry.penalty }}</span>
          </li>
        </ul>
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
 * un défi manqué et un minuteur expiré donnent tous zéro ou moins. Il a repris
 * du même coup le décompte détaillé, que la modale de fin de tour affichait
 * avant d'être remplacée par le score en grand.
 *
 * L'historique vient du MOTEUR, pas d'un cumul local : en multijoueur, tout le
 * monde doit lire la même chose, et un rechargement ne doit rien effacer.
 */
import type { Player, TurnRecord } from '@rf/engine'

const props = defineProps<{ history: TurnRecord[]; players: Player[] }>()

/** Ce que raconte la fin d'un tour, en trois mots. */
const WHY: Record<TurnRecord['reason'], string> = {
  stopped: '',
  'three-skulls': 'trois têtes — tour perdu',
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
      why: WHY[record.reason],
      total: signed(record.score),
      sign: record.score > 0 ? 'pos' : record.score < 0 ? 'neg' : 'zero',
      lines: scoreLines(record.breakdown),
      doubled: record.breakdown?.doubled === true,
      penalty: record.opponentPenalty > 0 ? record.opponentPenalty : 0
    }))
    // Le plus récent en tête : c'est celui qu'on vient de vivre et qu'on
    // cherche à comprendre.
    .reverse()
)

const open = ref<number | null>(null)

// Le dernier tour joué s'ouvre de lui-même : c'est la seule ligne qu'on vient
// consulter dans 99 % des cas.
watch(
  () => props.history.length,
  (n) => {
    if (n) open.value = n
  },
  { immediate: true }
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

  &__item {
    border-bottom: 1px solid rgba(201, 162, 39, 0.18);
  }

  &__row {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    width: 100%;
    padding: 0 0 var(--space-1);
    border: 0;
    background: none;
    color: inherit;
    font-family: inherit;
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
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
      color: #6ee08a;
    }

    &--neg {
      color: var(--danger-edge);
    }

    &--zero {
      color: var(--text-dim);
    }
  }

  // ── Décompte détaillé ─────────────────────────────────────────────────────
  &__detail {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0 0 var(--space-2) 1.6em;
    padding: var(--space-1) 0 0;
    border-top: 1px solid rgba(201, 162, 39, 0.12);
    list-style: none;
  }

  &__line {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.8rem;

    &--note {
      color: var(--text-dim);
      font-style: italic;
    }
  }

  &__icon {
    width: 1.1rem;
    height: 1.1rem;
    object-fit: contain;
  }

  &__label {
    flex: 1;
  }

  &__points {
    font-family: var(--font-mono);
  }
}
</style>
