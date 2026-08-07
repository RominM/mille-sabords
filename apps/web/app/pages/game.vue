<script setup lang="ts">
import type { BotDifficulty, DieFace } from '@rf/engine'
import layoutUrl from '~/assets/images/ui/layout-game.webp'
import ctaUrl from '~/assets/images/ui/main-cta.webp'
import stopSeal from '~/assets/images/ui/wax-seal-stop.webp'
import rulesIcon from '~/assets/images/ui/icon-rules.webp'
import darkLaugh from '~/assets/sounds/soundscrate-evil-chuckle-02.mp3'

const {
  WINNING_SCORE,
  TURN_SECONDS,
  secondsLeft,
  mode,
  difficulty,
  selected,
  rolling,
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
  rollOrReroll,
  stop,
  bank,
  unbank,
  toggleDie,
  continueGame,
  eligibleReroll,
  avatarOf,
  guardianDie
} = useGame()

/**
 * La Gardienne n'a de sens qu'affichée : sans indication, le joueur ignore
 * qu'il peut renvoyer une tête de mort — et perd un tour qu'il pouvait sauver.
 */
const guardianOffered = computed(
  () =>
    turn.value?.guardianAvailable === true &&
    turn.value?.phase === 'decision' &&
    !isBotTurn.value &&
    turn.value.dice.some((d) => d.face === 'skull')
)

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
const darkLaughAudio = ref<HTMLAudioElement | null>(null)
const showRules = ref(false)

const route = useRoute()
const router = useRouter()

/**
 * Le plateau est le même en solo et en multi : seule la provenance de l'équipage
 * change. Le mode passe donc par l'URL (`/game?mode=solo|multi`).
 *
 * En query plutôt qu'en segment de route : la reprise d'une partie interrompue
 * ajoutera un `?room=CODE` sans avoir à retoucher le chemin.
 */
const isSolo = computed(() => route.query.mode !== 'multi')

const { sfxGain } = useSoundSettings()

/**
 * Table composée dans le lobby : si elle existe, on démarre directement avec cet
 * équipage et l'écran de choix est sauté. Sinon on retombe sur le solo par
 * défaut (Toi contre Le Corsaire), accessible depuis l'accueil.
 */
const tableSetup = useTableSetup()

onMounted(function startFromLobby() {
  const setup = tableSetup.value
  if (setup?.roster.length) {
    pendingDifficulty.value = setup.difficulty
    newGame(setup.difficulty, setup.roster)
    tableSetup.value = null // consommée : « Rejouer » réutilisera le même équipage
    return
  }
  // En multi la table vient du lobby : sans elle (accès direct à l'URL,
  // rechargement de page), il n'y a rien à jouer — on renvoie composer l'équipage.
  if (!isSolo.value) router.push('/lobby')
})

const skulls = computed(() => {
  const t = turn.value
  if (!t) return 0
  return t.dice.filter((d) => d.face === 'skull').length + (t.card.type === 'skulls' ? t.card.count : 0)
})
const isBotTurn = computed(() => !!currentPlayer.value?.bot)

/** Tour perdu : les yeux du crâne du plateau s'embrasent. */
const isDefeat = computed(function detectDefeat() {
  const reason = turn.value?.outcome?.reason
  return reason === 'three-skulls' || reason === 'skull-island'
})
/** Les cachets restent affichés en permanence ; ils sont grisés hors de notre tour. */
const myTurn = computed(() => !isBotTurn.value && !rolling.value && turn.value?.phase !== 'ended')
// En phase de décision, le cachet ne s'allume que si la relance est LÉGALE :
// au moins deux dés à relancer, et au moins un dé gardé.
const canRoll = computed(() => {
  if (!myTurn.value) return false
  const phase = turn.value?.phase ?? ''
  if (phase === 'first-roll' || phase === 'island-roll') return true
  return phase === 'decision' && eligibleReroll().length > 0
})
const canStop = computed(() => myTurn.value && turn.value?.phase === 'decision')
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

/**
 * Centre = dés encore en jeu (ils repartiront à la relance).
 * Slots du bas = dés GARDÉS : ceux choisis par le joueur, plus les têtes de mort
 * (verrouillées, donc gardées d'office) et les dés réservés de l'Île au Trésor.
 */
const isKept = (d: { id: number; locked: boolean; banked: boolean }) =>
  d.locked || d.banked || selected.value.has(d.id)

const centerDice = computed(() =>
  turn.value ? turn.value.dice.filter((d) => d.face !== null && !isKept(d)) : []
)
const slotDice = computed(() =>
  turn.value ? turn.value.dice.filter((d) => d.face !== null && isKept(d)) : []
)

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

watch(isDefeat, async (value) => {
  if (!value) return
  // Le rire fait partie des bruitages : il suit le réglage « Ambiance ».
  if (sfxGain.value <= 0) return
  await nextTick()

  const audio = darkLaughAudio.value
  if (!audio) return

  // Volontairement plus discret que les bruitages d'interface.
  audio.volume = sfxGain.value * 0.6
  audio.currentTime = 0
  await audio.play()
})
</script>

<template>
  <div v-if="mode !== 'start'" class="stage">
    <div class="plateau" :style="{ backgroundImage: `url(${layoutUrl})` }">
      <!-- Rappel des règles, calé dans le creux entre le crâne et la lanterne gauche -->
      <button
        v-click-sound
        class="rules-link"
        type="button"
        aria-label="Règles"
        @click="showRules = true"
      >
        <img :src="rulesIcon" alt="" class="rules-link__icon" />
        <span class="rules-link__label">Règles</span>
      </button>

      <!-- Joueurs : colonne de 5 slots à gauche -->
      <div class="zone-players">
        <PlayerSlot
          v-for="i in 5"
          :key="i"
          :player="players[i - 1] ?? null"
          :avatar="players[i - 1] ? avatarOf(players[i - 1]!.id) : undefined"
          :current="gamePhase === 'playing' && i - 1 === currentIndex"
          :seconds="gamePhase === 'playing' && i - 1 === currentIndex ? secondsLeft : undefined"
          :total-seconds="TURN_SECONDS"
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
            :rescuable="guardianOffered && slotDice[i - 1]!.face === 'skull'"
            :selected="slotDice[i - 1]!.id !== guardianDie"
            @click="toggleDie(slotDice[i - 1]!.id)"
          />
        </div>
      </div>

      <!-- Zone d'action : les DEUX cachets sont toujours présents, simplement
           grisés quand l'action n'est pas possible (jet en cours, tour de l'IA). -->
      <div v-if="turn" class="zone-action">
        <div class="zone-action__roll">
          <WaxSeal label="Lancer" :disabled="!canRoll" @click="rollOrReroll" />
        </div>
        <div class="zone-action__stop">
          <WaxSeal label="S’arrêter" :image="stopSeal" :disabled="!canStop" @click="stop" />
        </div>
        <span v-if="isBotTurn" class="bot-banner">Le Corsaire réfléchit…</span>
      </div>

      <!-- Île au Trésor : réserver / reprendre des dés -->
      <div v-if="turn && !isBotTurn && turn.phase === 'decision' && isTreasure" class="zone-side">
        <button v-click-sound class="btn btn--ghost" :disabled="!bankCount" @click="bank">
          Réserver ({{ bankCount }})
        </button>
        <button v-click-sound class="btn btn--ghost" :disabled="!unbankCount" @click="unbank">
          Reprendre ({{ unbankCount }})
        </button>
      </div>

      <!-- Indice : sous les slots -->
      <p v-if="turn && !isBotTurn && turn.phase === 'decision'" class="zone-hint">
        <span v-if="transient" class="danger-txt">⛔ {{ transient }}</span>
        <span v-else-if="guardianDie !== null" class="guardian-txt">
          🗝 Tête de mort confiée à la Gardienne — elle repartira à la relance.
        </span>
        <span v-else-if="guardianOffered" class="guardian-txt">
          🗝 Gardienne : clique une tête de mort pour la relancer, une fois dans le tour.
        </span>
        <span v-else>Sélectionne les dés que tu veux GARDER, puis relance les autres — ou arrête-toi.</span>
      </p>
      <p v-else-if="turn && !isBotTurn && turn.phase === 'island-roll'" class="zone-hint">
        Île de la Tête-de-Mort : relance forcée tant que des têtes sortent.
      </p>
    </div>
  </div>

  <!-- Overlays ─────────────────────────────────────────────────────────────── -->
  <!-- Choix de la difficulté : propre au solo, en multi l'équipage vient du lobby -->
  <div v-if="mode === 'start' && isSolo" class="overlay">
    <div class="panel">
      <h2>Reckless Fathoms</h2>
      <p class="card-effect">Affronte Le Corsaire (l’IA) en solo. Premier à {{ WINNING_SCORE }} points.</p>
      <div class="diff-choices">
        <button
          v-for="d in diffs"
          :key="d.value"
          v-click-sound
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

  <!-- Récapitulatif de fin de tour, sur le parchemin comme les autres modales.
       `turn.outcome` est nul après un minuteur expiré sans le moindre lancer :
       il n'y a alors rien à détailler, on enchaîne directement. -->
  <TurnRecap
    v-if="mode === 'turnEnd' && turn?.outcome"
    :outcome="turn.outcome"
    :actor="turnActor"
    :continue-label="gamePhase === 'finished' ? 'Voir le résultat' : 'Continuer'"
    @continue="continueGame"
  />

  <GameOverModal
    v-else-if="mode === 'finished'"
    :players="players"
    :winner="winner"
    :avatar-of="avatarOf"
    @replay="newGame(difficulty)"
    @menu="router.push('/')"
  />

  <RulesModal v-if="showRules" @close="showRules = false" />

  <ScalePoints />
  <!-- Défaite : le crâne du plateau ouvre des yeux rouges -->
  <div v-if="isDefeat">
    <SkullEyes />
    <!-- Pas d'`autoplay` : la lecture passe par le watcher, qui applique le
         réglage « Ambiance ». L'attribut jouerait le son même réglage coupé. -->
    <audio ref="darkLaughAudio" :src="darkLaugh" />
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
// Le coin haut-droit est occupé par la carte dessinée sur le fond : on se cale
// dans le creux libre entre le crâne et la lanterne de gauche. Tailles en cqw
// pour suivre le plateau au redimensionnement.
.rules-link {
  position: absolute;
  top: 2.5%;
  right: 13%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2cqw;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition: transform 0.12s ease;

  &:hover {
    transform: scale(1.06);
  }

  &__icon {
    width: 4cqw;
    height: auto;
    filter: drop-shadow(0 2px 4px rgba(24, 14, 8, 0.8));
  }

  &__label {
    color: var(--parchment, #ede0c8);
    font-family: var(--font-body);
    font-size: 1.1cqw;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  }

  &:hover &__label {
    color: var(--accent);
  }
}

// Colonne des joueurs : calée sur l'échelle dessinée dans layout-game.webp
// (mesurée : barreaux entre y 270 et 718 px sur 941, x 99..347 sur 1672).
.zone-players {
  position: absolute;
  left: 5.8%;
  top: 28.79%;
  width: 14.9%;
  height: 47.6%;
  display: flex;
  flex-direction: column;
  gap: 0.74cqh; // = l'écart réel entre deux barreaux
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
  top: 75.7%;
  width: 50.7%;
  height: 11.9%;
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
// Zone d'action élargie : « Lancer » calé à gauche, « S'arrêter » à droite.
// Tailles en cqw → elles suivent le plateau au redimensionnement.
.zone-action {
  position: absolute;
  display: flex;
  flex-direction: column;
  right: 18%;
  bottom: 19%;
  width: 12cqw;
  height: 12cqw;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.zone-action__roll {
  flex: 0 0 auto;
  width: 8.7cqw;
  height: 8.7cqw;
  margin: 0 auto -18px 0;
}
// Le cachet « S'arrêter » est volontairement plus petit que « Lancer ».
.zone-action__stop {
  flex: 0 0 auto;
  width: 6.5cqw;
  height: 6.5cqw;
  margin: 0 0 0 auto;
}
.zone-action .btn {
  font-size: 1.5cqw;
  padding: 0.5cqw 1.2cqw;
}

// Actions secondaires (s'arrêter / Île au Trésor), sous le cachet
.zone-side {
  position: absolute;
  right: 20%;
  top: 73%;
  width: 11%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6cqw;
  align-items: center;
  justify-content: center;
}
.zone-side .btn {
  font-size: 1.3cqw;
  padding: 0.4cqw 1cqw;
}
// Le cachet remplit la boîte que lui donne .zone-action__roll / __stop
.zone-action :deep(.wax) {
  width: 100%;
  height: 100%;
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

.guardian-txt {
  color: var(--accent);
  font-weight: 600;
}

.zone-hint {
  position: absolute;
  bottom: 50px;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 47%;
  text-align: center;
  color: var(--parchment, #ede0c8);
  font-size: 1.3cqw;
  font-weight: 300;
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
