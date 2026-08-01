<script setup lang="ts">
import type { BotDifficulty, DieFace } from '@ms/engine'
import layoutUrl from '~/assets/images/ui/layout-game.png'

const {
  WINNING_SCORE,
  mode,
  difficulty,
  selected,
  turnActor,
  transient,
  turn,
  players,
  currentIndex,
  currentPlayer,
  gamePhase,
  winner,
  newGame,
  roll,
  reroll,
  stop,
  bank,
  unbank,
  toggleDie,
  continueGame,
  eligibleReroll
} = useGame()

const FACE: Record<DieFace, string> = {
  sabre: '⚔️',
  skull: '💀',
  monkey: '🐵',
  parrot: '🦜',
  coin: '🪙',
  diamond: '💎'
}

const diffs: { value: BotDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' }
]
const pendingDifficulty = ref<BotDifficulty>('medium')

const skulls = computed(() => {
  const t = turn.value
  if (!t) return 0
  return t.dice.filter((d) => d.face === 'skull').length + (t.card.type === 'skulls' ? t.card.count : 0)
})
const isBotTurn = computed(() => !!currentPlayer.value?.bot)
const clickable = computed(() => !isBotTurn.value && turn.value?.phase === 'decision')
const isTreasure = computed(() => turn.value?.card.type === 'treasure-island')
const rerollCount = computed(() => eligibleReroll().length)
const bankCount = computed(
  () =>
    [...selected.value].filter(
      (id) => !turn.value!.dice[id]!.banked && turn.value!.dice[id]!.face !== 'skull'
    ).length
)
const unbankCount = computed(() => [...selected.value].filter((id) => turn.value!.dice[id]!.banked).length)

// Dés en jeu (au centre) vs dés sélectionnés (dans les slots du bas).
const centerDice = computed(() =>
  turn.value ? turn.value.dice.filter((d) => d.face !== null && !selected.value.has(d.id)) : []
)
const slotDice = computed(() => (turn.value ? turn.value.dice.filter((d) => selected.value.has(d.id)) : []))

const outcome = computed(() => {
  const o = turn.value?.outcome
  if (!o) return { title: 'Tour terminé', lines: [] as string[], score: 0, cls: '' }
  const lines: string[] = []
  let title = ''
  if (o.reason === 'stopped') {
    title = 'Tour terminé'
    const b = o.breakdown!
    for (const c of b.combos)
      lines.push(`${c.count}× ${c.face === 'animals' ? 'Animaux' : FACE[c.face]} → +${c.points}`)
    if (b.treasures) lines.push(`Trésors → +${b.treasures}`)
    if (b.fullChest) lines.push('Coffre plein → +500')
    if (b.shipResult === 'success') lines.push('Bateau réussi ✅')
    if (b.shipResult === 'failed') lines.push('Bateau raté ❌')
    if (b.doubled) lines.push('Carte Pirate ×2')
  } else if (o.reason === 'three-skulls') {
    title = '💀 Trois têtes — tour perdu'
  } else {
    title = '☠ Île de la Tête-de-Mort'
    lines.push(`Chaque adversaire perd ${o.opponentPenalty} pts`)
  }
  return { title, lines, score: o.score, cls: o.score < 0 ? 'neg' : o.score > 0 ? 'pos' : '' }
})
</script>

<template>
  <div v-if="mode !== 'start'" class="stage">
    <div class="plateau" :style="{ backgroundImage: `url(${layoutUrl})` }">
      <NuxtLink to="/styleguide" class="sg-link">design system ↗</NuxtLink>

      <!-- Joueurs : colonne de 5 slots à gauche -->
      <div class="zone-players">
        <PlayerSlot
          v-for="i in 5"
          :key="i"
          :player="players[i - 1] ?? null"
          :current="gamePhase === 'playing' && i - 1 === currentIndex"
        />
      </div>

      <!-- Carte Pirate : cadre à droite -->
      <div v-if="turn" class="zone-card">
        <PirateCard :card="turn.card" :skulls="skulls" />
      </div>

      <!-- Dés en jeu : au centre du plateau -->
      <div v-if="turn" class="zone-center">
        <div v-for="d in centerDice" :key="d.id" class="die-cell die-cell--big">
          <DieView :die="d" :clickable="clickable" @click="toggleDie(d.id)" />
        </div>
      </div>

      <!-- Dés sélectionnés : dans les slots du bas -->
      <div v-if="turn" class="zone-slots">
        <div v-for="i in 8" :key="i" class="die-cell">
          <DieView
            v-if="slotDice[i - 1]"
            :die="slotDice[i - 1]!"
            :clickable="clickable"
            :selected="true"
            @click="toggleDie(slotDice[i - 1]!.id)"
          />
        </div>
      </div>

      <!-- Zone d'action : bas-droite, au-dessus des slots, à gauche de la carte -->
      <div v-if="turn" class="zone-action">
        <template v-if="isBotTurn">
          <span class="bot-banner">Le Corsaire réfléchit…</span>
        </template>
        <template v-else-if="turn.phase === 'first-roll' || turn.phase === 'island-roll'">
          <WaxSeal label="Lancer" @click="roll" />
        </template>
        <template v-else-if="turn.phase === 'decision'">
          <button class="btn" :disabled="rerollCount < 2" @click="reroll">
            Relancer ({{ rerollCount }})
          </button>
          <template v-if="isTreasure">
            <button class="btn btn--ghost" :disabled="!bankCount" @click="bank">
              Réserver ({{ bankCount }})
            </button>
            <button class="btn btn--ghost" :disabled="!unbankCount" @click="unbank">
              Reprendre ({{ unbankCount }})
            </button>
          </template>
          <button class="btn btn--ghost" @click="stop">S’arrêter</button>
        </template>
      </div>

      <!-- Indice : sous les slots -->
      <p v-if="turn && !isBotTurn && turn.phase === 'decision'" class="zone-hint">
        <span v-if="transient" class="danger-txt">⛔ {{ transient }}</span>
        <span v-else>Clique un dé pour le réserver (min 2, garde-en un), puis relance — ou arrête-toi.</span>
      </p>
      <p v-else-if="turn && !isBotTurn && turn.phase === 'island-roll'" class="zone-hint">
        Île de la Tête-de-Mort : relance forcée tant que des têtes sortent.
      </p>
    </div>
  </div>

  <!-- Overlays ─────────────────────────────────────────────────────────────── -->
  <div v-if="mode === 'start'" class="overlay">
    <div class="panel">
      <h2>Mille Sabords</h2>
      <p class="card-effect">Affronte Le Corsaire (l’IA) en solo. Premier à {{ WINNING_SCORE }} points.</p>
      <div class="diff-choices">
        <button
          v-for="d in diffs"
          :key="d.value"
          class="btn"
          :class="{ 'btn--ghost': pendingDifficulty !== d.value }"
          @click="pendingDifficulty = d.value"
        >
          {{ d.label }}
        </button>
      </div>
      <WaxSeal label="Jouer" @click="newGame(pendingDifficulty)" />
    </div>
  </div>

  <div v-else-if="mode === 'turnEnd'" class="overlay">
    <div class="panel">
      <h2>{{ outcome.title }}</h2>
      <div class="outcome-lines">
        <span v-for="(l, i) in outcome.lines" :key="i">{{ l }}</span>
        <span :class="outcome.cls">
          <strong>{{ turnActor }} : {{ outcome.score >= 0 ? '+' : '' }}{{ outcome.score }} pts</strong>
        </span>
      </div>
      <button class="btn" @click="continueGame">
        {{ gamePhase === 'finished' ? 'Voir le résultat' : 'Continuer' }}
      </button>
    </div>
  </div>

  <div v-else-if="mode === 'finished'" class="overlay">
    <div class="panel">
      <h2>🏆 {{ winner?.name }} l’emporte !</h2>
      <div class="outcome-lines">
        <span v-for="p in players" :key="p.id">{{ p.name }} : {{ p.score }} pts</span>
      </div>
      <WaxSeal label="Rejouer" @click="newGame(difficulty)" />
    </div>
  </div>
</template>

<style scoped lang="scss">
// ── Scène : remplit la fenêtre, centre le plateau, letterbox autour ─────────
.stage {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
}

// ── Plateau : verrouillé sur l'aspect ratio du fond (16:9) ──────────────────
// On garde les proportions du fond (pas d'étirement → carte non déformée, cachet
// rond) et on le fait RENTRER dans la fenêtre (le plus grand 16:9 possible, avec
// une marge/letterbox). Zones en % → toujours pile alignées aux cadres.
.plateau {
  position: relative;
  aspect-ratio: 1672 / 941;
  width: min(100dvw, calc(100dvh * 1672 / 941));
  max-width: 100dvw;
  max-height: 100dvh;
  background-position: center;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  container-type: size;
  overflow: hidden;
}
.sg-link {
  position: absolute;
  top: 1.5%;
  right: 2%;
  z-index: 2;
  font-family: var(--font-mono);
  font-size: 1cqw;
  color: var(--text-dim);
}

.zone-players {
  position: absolute;
  left: 6%;
  top: 28%;
  width: 14%;
  height: 48%;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.zone-card {
  position: absolute;
  left: 78.999%;
  top: 30%;
  width: 13.79%;
  height: 40%;
}

// Dés en jeu, au centre
.zone-center {
  position: absolute;
  left: 21%;
  top: 21%;
  width: 58%;
  height: 45%;
  display: flex;
  flex-wrap: wrap;
  gap: 1.6cqw;
  align-content: center;
  justify-content: center;
}
.die-cell--big {
  width: 9.5cqw;
  height: 9.5cqw;
}

// Slots du bas : dés sélectionnés
.zone-slots {
  position: absolute;
  left: 24.6%;
  top: 75.5%;
  width: 46.4%;
  height: 10.5%;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.6%;
  place-items: center;
}
.die-cell {
  display: grid;
  place-items: center;
}
// Dés réservés : remplissent leur slot (et s'étirent avec le plateau au resize).
.zone-slots .die-cell {
  width: 100%;
  height: 100%;
}

// Zone d'action : bas-droite, au-dessus des slots, à gauche de la carte
.zone-action {
  position: absolute;
  right: 21%;
  bottom: 22%;
  width: 150px;
  height: 150px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.8cqw;
}
.zone-action .btn {
  font-size: 1.5cqw;
  padding: 0.5cqw 1.2cqw;
}
.zone-action :deep(.wax) {
  // width: 11cqw;
  // height: 11cqw;
}
.bot-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 1.9cqw;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}
.bot-banner::before {
  content: '🤖';
}

.zone-hint {
  position: absolute;
  left: 24%;
  top: 87.5%;
  width: 47%;
  text-align: center;
  color: var(--parchment, #ede0c8);
  font-size: 1.5cqw;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
}
.danger-txt {
  color: var(--danger-edge);
  font-weight: 600;
}

// ── Overlays ─────────────────────────────────────────────────────────────────
.overlay {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: rgba(24, 14, 8, 0.78);
}
.overlay .panel {
  max-width: 460px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}
.overlay h2 {
  color: var(--accent);
}
.card-effect {
  color: var(--text-dim);
  max-width: 52ch;
}
.diff-choices {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}
.outcome-lines {
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.outcome-lines .neg {
  color: var(--danger-edge);
}
.outcome-lines .pos {
  color: var(--success);
}
</style>
