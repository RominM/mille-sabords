<template>
  <div class="game">
    <!-- En multi, la partie vit sur le serveur : entre l'entrée sur la page et
         la première réponse, il n'y a rien à dessiner. -->
    <AppLoader v-if="waitingForTable" :loaded="0" :total="0" :progress="0" hint="Connexion à la table…" />

    <div v-else-if="mode !== 'start'" class="game__stage">
      <div ref="plateauEl" class="game__board" :style="{ backgroundImage: `url(${layoutUrl})` }">
        <TurnBar
          v-if="gamePhase === 'playing' && turn"
          :seconds="secondsLeft"
          :total="TURN_SECONDS"
        />

        <BoardTools @rules="showRules = true" @settings="showSettings = true" />

        <BoardCrew
          :players="players"
          :avatars="portraits"
          :current-index="gamePhase === 'playing' ? currentIndex : -1"
        />

        <div v-if="potentialScore !== null" class="game__live" :style="zoneStyle(LIVE_ZONE)">
          <LiveScore :score="potentialScore" />
        </div>

        <div v-if="turn" class="game__card" :style="zoneStyle(CARD_ZONE)">
          <PirateCard :card="turn.card" :skulls="skulls" />
        </div>

        <BoardDice
          v-if="turn"
          :dice="centerDice"
          :roll="rollSeq"
          :clickable="clickable"
          :held-die="heldDie"
          @grab="grab"
          @toggle="toggleDie"
        />

        <BoardSlots
          v-if="turn"
          :dice="slotDice"
          :clickable="clickable"
          :guardian-offered="guardianOffered"
          :guardian-die="guardianDie"
          :hovered="hovered"
          :held-die="heldDie"
          @grab="grab"
          @toggle="toggleDie"
        />

        <BoardSeals
          v-if="turn"
          :can-roll="canRoll"
          :can-stop="canStop"
          :bot-thinking="isBotTurn"
          @roll="rollOrReroll"
          @stop="stop"
        />

        <BoardHint v-if="hint" :text="hint.text" :tone="hint.tone" />

        <!-- Île de la Tête-de-Mort : la lumière du plateau tourne au braise. La
             phase la plus dangereuse du jeu ne se distinguait par rien. -->
        <IslandAmbience v-if="isIsland" />
      </div>
    </div>

    <!-- Surcouches ─────────────────────────────────────────────────────────── -->
    <TurnCall v-if="announcing && mode === 'playing'" />

    <TurnFlash v-if="mode === 'turnEnd' && turn?.outcome" :outcome="turn.outcome" :actor="turnActor" />

    <GameOverModal
      v-if="mode === 'finished'"
      :players="players"
      :winner="winner"
      :avatar-of="portraitOf"
      @replay="newGame(difficulty)"
      @menu="router.push('/')"
    />

    <RulesModal v-if="showRules" @close="showRules = false" />

    <GameSettingsModal v-if="showSettings" @close="showSettings = false" @quit="leaveGame" />

    <!-- Le dé en main : le vrai cube, décollé du plateau et suspendu au
         pointeur. `Teleport` vers le body — `.game__board` piégerait un fixed. -->
    <Teleport to="body">
      <div v-if="heldFace" class="game__held" :style="{ left: `${at.x}px`, top: `${at.y}px` }">
        <DieCube :face="heldFace" :roll="0" />
      </div>
    </Teleport>

    <ScalePoints />
    <TurnLog :history="history" :players="players" />

    <!-- Défaite : le crâne du plateau ouvre des yeux rouges -->
    <div v-if="isDefeat">
      <SkullEyes />
      <!-- Pas d'`autoplay` : la lecture passe par le watcher, qui applique le
           réglage « Ambiance ». L'attribut jouerait le son réglage coupé. -->
      <audio ref="darkLaughAudio" :src="darkLaugh" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Le plateau. ORCHESTRATEUR : il assemble des blocs et leur passe l'état, il ne
 * dessine rien lui-même et n'applique aucune règle.
 *
 * L'autorité est ailleurs — le moteur en solo, le serveur en multi — et cette
 * page ne fait que la refléter.
 */
import layoutUrl from '~/assets/images/ui/layout-game.png'
import darkLaugh from '~/assets/sounds/soundscrate-evil-chuckle-02.mp3'

const route = useRoute()
const router = useRouter()

/**
 * Le mode est lu UNE fois : il détermine qui fait autorité, et cela ne peut pas
 * changer en cours de partie.
 */
const isSolo = route.query.mode !== 'multi'
const room = useRoom()
const tableSetup = useTableSetup()
const { sfxGain } = useSoundSettings()

const {
  TURN_SECONDS,
  secondsLeft,
  mode,
  difficulty,
  slots,
  keptIds,
  moveToSlot,
  rolling,
  rollSeq,
  turnActor,
  transient,
  turn,
  players,
  history,
  currentIndex,
  currentPlayer,
  gamePhase,
  winner,
  newGame,
  rollOrReroll,
  stop,
  toggleDie,
  eligibleReroll,
  avatarOf,
  guardianDie,
  potentialScore
} = useGame(isSolo ? createLocalTransport() : createNetworkTransport(room))

const plateauEl = ref<HTMLElement | null>(null)
const darkLaughAudio = ref<HTMLAudioElement | null>(null)
const showRules = ref(false)
const showSettings = ref(false)

const isBotTurn = computed(() => !!currentPlayer.value?.bot)
const isIsland = computed(() => turn.value?.phase === 'island-roll')

/**
 * Le siège actif est-il le MIEN ? En solo, tout siège non-IA l'est. En multi il
 * faut le comparer à mon identifiant : sans ça chaque joueur verrait ses
 * boutons actifs pendant le tour des autres.
 */
const isMySeat = computed(() =>
  isSolo ? !isBotTurn.value : currentPlayer.value?.id === room.youId.value
)

/** Les cachets restent affichés en permanence ; ils sont grisés hors du tour. */
const myTurn = computed(() => isMySeat.value && !rolling.value && turn.value?.phase !== 'ended')
const clickable = computed(() => isMySeat.value && turn.value?.phase === 'decision')
const canStop = computed(() => myTurn.value && turn.value?.phase === 'decision')

// En phase de décision, le cachet ne s'allume que si la relance est LÉGALE :
// au moins deux dés à relancer, et au moins un dé gardé.
const canRoll = computed(() => {
  if (!myTurn.value) return false
  const phase = turn.value?.phase ?? ''
  if (phase === 'first-roll' || phase === 'island-roll') return true
  return phase === 'decision' && eligibleReroll().length > 0
})

/**
 * La Gardienne n'a de sens qu'affichée : sans indication, le joueur ignore
 * qu'il peut renvoyer une tête de mort — et perd un tour qu'il pouvait sauver.
 */
const guardianOffered = computed(
  () =>
    turn.value?.guardianAvailable === true &&
    turn.value?.phase === 'decision' &&
    isMySeat.value &&
    turn.value.dice.some((die) => die.face === 'skull')
)

const skulls = computed(() => {
  const state = turn.value
  if (!state) return 0
  return (
    state.dice.filter((die) => die.face === 'skull').length +
    (state.card.type === 'skulls' ? state.card.count : 0)
  )
})

/**
 * En multi, tant que le serveur n'a rien envoyé, il n'y a pas de table à
 * dessiner. En solo la question ne se pose pas : le moteur répond tout de suite.
 */
const waitingForTable = computed(() => !isSolo && !turn.value)

/** Tour perdu : les yeux du crâne du plateau s'embrasent. */
const isDefeat = computed(() => {
  const reason = turn.value?.outcome?.reason
  return reason === 'three-skulls' || reason === 'skull-island'
})

/**
 * Les dés encore SANS face restent de la partie, invisibles : leur composant
 * doit exister avant le premier jet du tour, sinon ce jet-là apparaîtrait tout
 * posé au lieu de rouler comme les suivants.
 */
const centerDice = computed(() =>
  turn.value ? turn.value.dice.filter((die) => !keptIds.value.includes(die.id)) : []
)

/**
 * Un dé par emplacement, à SA place — et non les dés gardés tassés à gauche.
 * C'est `slots` qui mémorise le rangement choisi au glisser-déposer.
 */
const slotDice = computed(() =>
  slots.value.map((id) => (id === null ? null : (turn.value?.dice[id] ?? null)))
)

/** Portraits résolus une fois pour toutes : les blocs n'ont pas à les chercher. */
const portraits = computed(() =>
  Object.fromEntries(players.value.map((player) => [player.id, portraitOf(player.id)]))
)

useBoardPerspective(plateauEl)
const { announcing } = useTurnCall(turn, isMySeat)

const { heldDie, hovered, at, grab } = useDiceDrag(({ slot, dieId }) => {
  const kept = keptIds.value.includes(dieId)

  // Lâché sur le plateau : le dé revient en jeu. C'est exactement ce que fait
  // un second clic — on repasse donc par la même porte, règles comprises.
  if (slot === null) {
    if (kept) toggleDie(dieId)
    return
  }

  // Lâché sur un cadre : on le garde s'il venait du centre, puis on le range à
  // la place demandée. Le rangement attend que la sélection soit prise en
  // compte, sinon il viserait une table d'emplacements périmée.
  if (!kept) toggleDie(dieId)
  void nextTick(() => moveToSlot(dieId, slot))
})

/** Face du dé en main, pour le dessiner sous le pointeur. */
const heldFace = computed(() =>
  heldDie.value === null ? null : (turn.value?.dice[heldDie.value]?.face ?? null)
)

const hint = useBoardHint({
  turn,
  transient,
  guardianDie,
  guardianOffered,
  botTurn: isBotTurn,
  canRoll
})

onMounted(function openTable() {
  if (isSolo) {
    const setup = tableSetup.value
    if (!setup?.roster.length) return
    newGame(setup.difficulty, setup.roster)
    tableSetup.value = null // consommée : « Rejouer » réutilisera le même équipage
    return
  }

  // En multi, la partie vit sur le serveur. Après un rechargement la connexion
  // est perdue mais le jeton demeure : on la rouvre seul et le serveur nous rend
  // notre siège. Sans salle connue, il n'y a rien à reprendre.
  if (room.connected.value) return
  if (!room.resume()) router.push('/lobby')
})

/**
 * Portrait d'un joueur. En solo il vient de la table composée sur place ; en
 * multi, de la composition que le serveur diffuse à part — l'état de partie ne
 * transporte pas les avatars, qui ne regardent pas les règles.
 */
function portraitOf(playerId: string): string | undefined {
  if (isSolo) return avatarOf(playerId)
  return room.roster.value.find((seat) => seat.id === playerId)?.avatar || undefined
}

/**
 * Quitter la partie. En multi on FERME la connexion avant de partir : sans
 * cela le siège resterait occupé par un joueur qui ne reviendra pas, et la
 * table attendrait ses décisions jusqu'à expiration du minuteur.
 */
function leaveGame(): void {
  showSettings.value = false
  if (!isSolo) room.close()
  router.push('/')
}

watch(isDefeat, async (defeated) => {
  if (!defeated) return
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

<style scoped lang="scss">
.game {
  // ── Scène : remplit la fenêtre, centre le plateau, letterbox autour ───────
  &__stage {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  // Verrouillé sur le ratio du fond (1672/941) : pas d'étirement, donc carte
  // non déformée et cachet rond. Les zones en % tombent alors toujours pile.
  &__board {
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

  // Place, taille et inclinaison viennent de `boardZones` : elles se règlent à
  // l'œil dans le labo, et le CSS ne sait que COMMENT les appliquer.
  &__live {
    position: absolute;
    z-index: 2;
    perspective: 90cqw;

    > * {
      transform: rotateZ(var(--tilt-z, 0deg)) rotateX(var(--tilt-x, 0deg))
        rotateY(var(--tilt-y, 0deg));
    }
  }

  // La carte est POSÉE à plat : le décor ne dessine plus de cadre pour
  // l'encastrer. C'est l'ombre qui la décolle du bois, pas une déformation.
  &__card {
    position: absolute;

    > * {
      width: 100%;
      height: 100%;
      // `drop-shadow` et non `box-shadow` : la carte a des bords irréguliers,
      // et une ombre rectangulaire trahirait la boîte au lieu du dessin.
      filter: drop-shadow(0 1.2cqh 1.4cqh rgba(24, 14, 8, 0.75));
    }
  }

  // Le dé saisi, suspendu au pointeur. Taille en pixels et non en `cqw` : il
  // vit dans le body, hors du conteneur qu'est le plateau.
  &__held {
    --die-size: 76px;

    position: fixed;
    z-index: 90;
    // Pas de `filter` ici, si tentant soit-il pour une ombre portée : il
    // aplatirait la scène 3D du cube.
    translate: -50% -50%;
    pointer-events: none;
  }
}
</style>
