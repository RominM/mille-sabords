<template>
  <Modal :title="title" @close="emit('continue')">
    <div class="recap">
      <p v-if="subtitle" class="recap__subtitle">{{ subtitle }}</p>

      <!-- Le détail ligne à ligne : un symbole, ce qu'il rapporte en combinaison,
           et son bonus propre quand il en a un (pièces et diamants). -->
      <ul v-if="lines.length" class="recap__lines">
        <li v-for="(line, i) in lines" :key="i" class="recap__line">
          <img v-if="line.icon" :src="line.icon" alt="" class="recap__icon" />
          <span class="recap__label">{{ line.label }}</span>
          <span class="recap__points">{{ signed(line.points) }}</span>
        </li>
      </ul>

      <p v-if="subtotalShown" class="recap__subtotal">
        Total des dés <span>{{ signed(subtotal) }}</span>
      </p>

      <p v-if="breakdown?.doubled" class="recap__doubled">
        Carte Pirate — points doublés : {{ subtotal }} × 2
      </p>

      <p class="recap__total" :class="`recap__total--${sign}`">
        {{ signed(outcome.score) }} pts
      </p>

      <p v-if="outcome.opponentPenalty > 0" class="recap__penalty">
        Chaque adversaire perd {{ outcome.opponentPenalty }} points
      </p>

      <p v-if="breakdown?.instantWin" class="recap__magic">
        ⚡ Magie pirate — neuf symboles identiques : la partie est gagnée !
      </p>

      <button v-click-sound class="btn recap__btn" type="button" @click="emit('continue')">
        {{ continueLabel }}
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Récapitulatif d'un tour : ce qui a été gagné, et POURQUOI.
 *
 * Le composant ne calcule aucun point — il lit le `breakdown` produit par le
 * moteur et le met en mots. Toute somme affichée vient donc de l'autorité des
 * règles, jamais d'un recalcul côté écran.
 */
import type { DieFace, TurnOutcome } from '@rf/engine'
import sabre from '~/assets/images/dice/die-face_sabre.webp'
import skull from '~/assets/images/dice/die-face_skull.webp'
import monkey from '~/assets/images/dice/die-face_monkey.webp'
import parrot from '~/assets/images/dice/die-face_parot.webp'
import coin from '~/assets/images/dice/die-fice_coin.webp'
import diamond from '~/assets/images/dice/die-face_diamond.webp'

const props = defineProps<{ outcome: TurnOutcome; actor: string; continueLabel: string }>()
const emit = defineEmits<{ continue: [] }>()

const FACE_IMG: Record<DieFace, string> = { sabre, skull, monkey, parrot, coin, diamond }
const FACE_NAME: Record<DieFace | 'animals', string> = {
  sabre: 'Sabres',
  skull: 'Têtes de mort',
  monkey: 'Singes',
  parrot: 'Perroquets',
  coin: 'Pièces d’or',
  diamond: 'Diamants',
  animals: 'Animaux'
}

const breakdown = computed(() => props.outcome.breakdown)

const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

const title = computed(() => {
  switch (props.outcome.reason) {
    case 'three-skulls':
      return 'Trois têtes — tour perdu'
    case 'skull-island':
      return 'Île de la Tête-de-Mort'
    default:
      return `Tour de ${props.actor}`
  }
})

const subtitle = computed(() => {
  if (props.outcome.reason === 'three-skulls')
    return 'Trois têtes de mort : les dés ne rapportent rien ce tour-ci.'
  if (props.outcome.reason === 'skull-island')
    return 'Aucun point pour toi — mais tes adversaires paient chaque tête révélée.'
  if (breakdown.value?.shipResult === 'failed')
    return 'Quota de sabres manqué : les dés ne rapportent rien, et la carte coûte sa valeur.'
  return ''
})

interface RecapLine {
  icon?: string
  label: string
  points: number
}

/**
 * Une ligne par cause de points. Les cas particuliers y figurent tous : coffre
 * plein, prime ou pénalité du Bateau Pirate, trésors comptés à part des
 * combinaisons — un joueur doit pouvoir refaire l'addition de tête.
 */
const lines = computed<RecapLine[]>(() => {
  const b = breakdown.value
  if (!b) return []
  const out: RecapLine[] = []

  // Défi manqué : les dés ne rapportent RIEN, quels qu'ils soient. Les lister
  // laisserait croire à une addition qui ne tombe pas juste.
  if (b.shipResult === 'failed') {
    return [{ icon: FACE_IMG.sabre, label: 'Défi du Bateau Pirate échoué', points: -b.shipValue }]
  }

  for (const c of b.combos) {
    out.push({
      icon: c.face === 'animals' ? undefined : FACE_IMG[c.face],
      label: `${FACE_NAME[c.face]} ×${c.count}`,
      points: c.points
    })
  }

  for (const t of b.treasureDetail) {
    out.push({
      icon: FACE_IMG[t.face],
      label: `${FACE_NAME[t.face]} ×${t.count} — bonus`,
      points: t.points
    })
  }

  if (b.fullChest) out.push({ label: 'Coffre au trésor plein', points: 500 })

  if (b.shipResult === 'success')
    out.push({ icon: FACE_IMG.sabre, label: 'Défi du Bateau Pirate relevé', points: b.shipValue })

  return out
})

const subtotal = computed(() => lines.value.reduce((sum, l) => sum + l.points, 0))

/** Inutile d'afficher un sous-total quand il n'y a qu'une ligne. */
const subtotalShown = computed(() => lines.value.length > 1)

const sign = computed(() =>
  props.outcome.score > 0 ? 'pos' : props.outcome.score < 0 ? 'neg' : 'zero'
)
</script>

<style scoped lang="scss">
// Le parchemin est clair : tout le texte doit être sombre.
$ink: #2a1c0e;

.recap {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: $ink;
  font-family: var(--font-body);
  text-align: left;

  &__subtitle {
    font-size: 1.05rem;
    opacity: 0.85;
  }

  &__lines {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__line {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 1.1rem;
  }

  &__icon {
    width: 1.9rem;
    height: 1.9rem;
    object-fit: contain;
  }

  // Le libellé pousse les points contre le bord droit : la colonne de chiffres
  // reste alignée, on lit l'addition d'un coup d'œil.
  &__label {
    flex: 1;
  }

  &__points {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  &__subtotal,
  &__doubled {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px solid rgba(42, 28, 14, 0.3);
    font-size: 1.1rem;

    span {
      font-family: var(--font-mono);
      font-weight: 600;
    }
  }

  &__total {
    font-family: var(--font-display);
    font-size: 2.6rem;
    line-height: 1;
    text-align: center;

    &--pos {
      color: #1f6b3a;
    }

    &--neg {
      color: #8c2f2f;
    }
  }

  &__penalty,
  &__magic {
    font-size: 1.05rem;
    font-weight: 600;
  }

  &__btn {
    align-self: center;
    padding: var(--space-3) var(--space-5);
    font-size: 1.2rem;
  }
}
</style>
