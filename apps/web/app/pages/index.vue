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
  <div v-if="mode !== 'start'" class="plateau-wrap">
    <NuxtLink to="/styleguide" class="sg-link">design system ↗</NuxtLink>

    <div class="plateau" :style="{ backgroundImage: `url(${layoutUrl})` }">
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

      <!-- Dés : rangée de 8 en bas-centre -->
      <div v-if="turn" class="zone-dice">
        <DieView
          v-for="d in turn.dice"
          :key="d.id"
          :die="d"
          :clickable="clickable"
          :selected="selected.has(d.id)"
          @click="toggleDie(d.id)"
        />
      </div>

      <!-- Zone d'action : centre du plateau -->
      <div v-if="turn" class="zone-action">
        <template v-if="isBotTurn">
          <span class="bot-banner">Le Corsaire réfléchit…</span>
        </template>
        <template v-else-if="turn.phase === 'first-roll' || turn.phase === 'island-roll'">
          <WaxSeal label="Lancer" @click="roll" />
          <p class="hint">
            {{ turn.phase === 'island-roll' ? 'Île de la Tête-de-Mort : relance forcée.' : 'Lance les 8 dés.' }}
          </p>
        </template>
        <template v-else-if="turn.phase === 'decision'">
          <div class="action-btns">
            <button class="btn" :disabled="rerollCount < 2" @click="reroll">Relancer ({{ rerollCount }})</button>
            <template v-if="isTreasure">
              <button class="btn btn--ghost" :disabled="!bankCount" @click="bank">Réserver ({{ bankCount }})</button>
              <button class="btn btn--ghost" :disabled="!unbankCount" @click="unbank">Reprendre ({{ unbankCount }})</button>
            </template>
            <button class="btn btn--ghost" @click="stop">S’arrêter</button>
          </div>
          <p class="hint">
            <span v-if="transient" class="danger-txt">⛔ {{ transient }}</span>
            <span v-else>Choisis des dés à relancer (min 2, garde-en un), ou arrête-toi.</span>
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
// ── Plateau ──────────────────────────────────────────────────────────────────
// Le fond `layout-game.png` porte les cadres (joueurs à gauche, dés en bas,
// carte à droite). Les zones sont positionnées en % pour s'aligner dessus.
// Ces valeurs sont facilement ajustables si un cadre n'est pas pile aligné.
.plateau-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-3);
  position: relative;
}
.sg-link {
  position: absolute;
  top: var(--space-2);
  right: var(--space-3);
  z-index: 2;
  font-family: var(--font-mono);
  font-size: var(--fs-body-s);
  color: var(--text-dim);
}
.plateau {
  position: relative;
  width: 100%;
  max-width: 1400px;
  aspect-ratio: 1672 / 941;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  container-type: size;
}

.zone-players {
  position: absolute;
  left: 5.4%;
  top: 27%;
  width: 15.6%;
  height: 47.5%;
  display: flex;
  flex-direction: column;
  gap: 1.1%;
}
.zone-card {
  position: absolute;
  left: 77.6%;
  top: 30%;
  width: 15%;
  height: 40%;
}
.zone-dice {
  position: absolute;
  left: 24.4%;
  top: 74.8%;
  width: 46.2%;
  height: 11%;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.5%;
  place-items: center;
}
.zone-action {
  position: absolute;
  left: 49%;
  top: 42%;
  transform: translate(-50%, -50%);
  width: 40%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}
.action-btns {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}
.hint {
  color: var(--parchment, #ede0c8);
  font-size: clamp(0.75rem, 1.4cqw, 1rem);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}
.danger-txt {
  color: var(--danger-edge);
  font-weight: 600;
}
.bot-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--accent);
  font-family: var(--font-body);
  font-size: clamp(1rem, 1.8cqw, 1.4rem);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}
.bot-banner::before {
  content: '🤖';
}

// ── Overlays (démarrage / fin de tour / victoire) ────────────────────────────
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
