<script setup lang="ts">
import type { BotDifficulty, DieFace } from '@ms/engine'

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
  eligibleReroll,
} = useGame()

const FACE: Record<DieFace, string> = {
  sabre: '⚔️',
  skull: '💀',
  monkey: '🐵',
  parrot: '🦜',
  coin: '🪙',
  diamond: '💎',
}

const diffs: { value: BotDifficulty; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' },
]
const pendingDifficulty = ref<BotDifficulty>('medium')

const skulls = computed(() => {
  const t = turn.value
  if (!t) return 0
  return t.dice.filter(d => d.face === 'skull').length + (t.card.type === 'skulls' ? t.card.count : 0)
})
const isBotTurn = computed(() => !!currentPlayer.value?.bot)
const clickable = computed(() => !isBotTurn.value && turn.value?.phase === 'decision')
const isTreasure = computed(() => turn.value?.card.type === 'treasure-island')
const rerollCount = computed(() => eligibleReroll().length)
const bankCount = computed(
  () => [...selected.value].filter(id => !turn.value!.dice[id]!.banked && turn.value!.dice[id]!.face !== 'skull').length,
)
const unbankCount = computed(() => [...selected.value].filter(id => turn.value!.dice[id]!.banked).length)

const outcome = computed(() => {
  const o = turn.value?.outcome
  if (!o) return { title: 'Tour terminé', lines: [] as string[], score: 0, cls: '' }
  const lines: string[] = []
  let title = ''
  if (o.reason === 'stopped') {
    title = 'Tour terminé'
    const b = o.breakdown!
    for (const c of b.combos) lines.push(`${c.count}× ${c.face === 'animals' ? 'Animaux' : FACE[c.face]} → +${c.points}`)
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
  <div v-if="mode !== 'start'" class="board">
    <div class="topbar">
      <h1>Mille Sabords</h1>
      <NuxtLink to="/styleguide">design system ↗</NuxtLink>
    </div>

    <ScoreBoard :players="players" :current-index="currentIndex" :active="gamePhase === 'playing'" />

    <div v-if="turn" class="stage">
      <PirateCard :card="turn.card" :skulls="skulls" />

      <div class="dice-grid">
        <DieView
          v-for="d in turn.dice"
          :key="d.id"
          :die="d"
          :clickable="clickable"
          :selected="selected.has(d.id)"
          @click="toggleDie(d.id)"
        />
      </div>

      <div class="actionbar">
        <template v-if="isBotTurn"><span class="bot-banner">Le Corsaire réfléchit…</span></template>
        <template v-else-if="turn.phase === 'first-roll'">
          <WaxSeal label="Lancer" @click="roll" />
          <p class="hint">Lance les 8 dés Corsaires.</p>
        </template>
        <template v-else-if="turn.phase === 'island-roll'">
          <WaxSeal label="Lancer" @click="roll" />
          <p class="hint">Île de la Tête-de-Mort : relance forcée tant que des têtes sortent.</p>
        </template>
        <template v-else-if="turn.phase === 'decision'">
          <button class="btn" :disabled="rerollCount < 2" @click="reroll">Relancer ({{ rerollCount }})</button>
          <template v-if="isTreasure">
            <button class="btn btn--ghost" :disabled="!bankCount" @click="bank">Réserver ({{ bankCount }})</button>
            <button class="btn btn--ghost" :disabled="!unbankCount" @click="unbank">Reprendre ({{ unbankCount }})</button>
          </template>
          <button class="btn btn--ghost" @click="stop">S’arrêter</button>
          <p class="hint">
            <span v-if="transient" class="card-skulls">⛔ {{ transient }}</span>
            <span v-else>Sélectionne des dés à relancer (min 2, garde-en un), ou arrête-toi.</span>
          </p>
        </template>
      </div>
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
      <button class="btn" @click="continueGame">{{ gamePhase === 'finished' ? 'Voir le résultat' : 'Continuer' }}</button>
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
.board {
  max-width: 940px;
  margin: 0 auto;
  min-height: 100vh;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.topbar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.topbar h1 {
  font-size: var(--fs-display-m);
  color: var(--accent);
}
.topbar a {
  font-family: var(--font-mono);
  font-size: var(--fs-body-s);
  color: var(--text-dim);
}
.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-5);
}
.dice-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: center;
  max-width: 620px;
}
.actionbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  min-height: 170px;
}
.hint {
  flex-basis: 100%;
  text-align: center;
  color: var(--text-dim);
}
.bot-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--accent);
  font-family: var(--font-body);
  font-size: var(--fs-body-l);
}
.bot-banner::before {
  content: '🤖';
}
.card-effect {
  color: var(--text-dim);
  max-width: 52ch;
}
.card-skulls {
  color: var(--danger-edge);
  font-weight: 600;
}

// Overlays
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: rgba(24, 14, 8, 0.74);
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
