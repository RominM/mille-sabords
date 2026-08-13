<template>
  <!-- En multi, la partie vit sur le serveur : entre l'entrée sur la page et la
       première réponse, il n'y a rien à dessiner. On réutilise le chargeur du
       jeu plutôt que de laisser un fond nu. -->
  <AppLoader v-if="waitingForTable" :loaded="0" :total="0" :progress="0" hint="Connexion à la table…" />

  <div v-else-if="mode !== 'start'" class="stage">
    <div ref="plateauEl" class="plateau" :style="{ backgroundImage: `url(${layoutUrl})` }">
      <!-- Minuteur de décision : un seul bandeau pour la table, en haut. Le
           compte à rebours ne concerne que le siège actif — le répéter sur
           chaque carte laissait croire que tout le monde était chronométré. -->
      <TurnBar v-if="gamePhase === 'playing' && turn" :seconds="secondsLeft" :total="TURN_SECONDS" />

      <div class="zone-action-layout">
        <button
          v-click-sound
          v-tooltip="'Règles'"
          type="button"
          class="zone-action-layout__rules btn"
          aria-label="Règles"
          @click="showRules = true"
        >
          <img :src="rulesIcon" alt="" class="zone-action-layout__rules__icon" />
        </button>

        <button
          v-click-sound
          v-tooltip="'Paramètres — son, et quitter la partie'"
          class="btn"
          type="button"
          aria-label="Paramètres"
          @click="showSettings = true"
        >
          <component
            :is="Cog"
            class="zone-action-layout__tab-icon"
            :size="40"
            :stroke-width="1.75"
            color="#c9a227"
          />
        </button>
      </div>

      <!-- Joueurs : colonne de 5 slots à gauche -->
      <div class="zone-players">
        <!-- Un slot par joueur RÉEL, et non cinq cases fixes : la table monte
            désormais à huit, et la colonne défile plutôt que de déborder. -->
        <div v-for="(p, i) in players" class="gamer-wrapper">
          <GamerSlot
            size="100%"
            :player="p"
            :key="p.id"
            :avatar="portraitOf(p.id)"
            :current="gamePhase === 'playing' && i === currentIndex"
          />
        </div>
        <!-- <PlayerSlot
          v-for="(p, i) in players"
          :key="p.id"
          :player="p"
          :avatar="portraitOf(p.id)"
          :current="gamePhase === 'playing' && i === currentIndex"
          :seconds="gamePhase === 'playing' && i === currentIndex ? secondsLeft : undefined"
          :total-seconds="TURN_SECONDS"
        /> -->
      </div>

      <!-- Points en jeu, juste au-dessus de la carte : le joueur doit pouvoir
           arbitrer « je relance ou j'encaisse » sans quitter le plateau des yeux. -->
      <div v-if="potentialScore !== null" class="zone-live" :style="zoneStyle(LIVE_ZONE)">
        <LiveScore :score="potentialScore" />
      </div>

      <!-- Carte Pirate : dans le cadre dessiné à droite. Place et inclinaison
           viennent de `boardZones` — un seul objet, une seule place, des angles
           donnés en clair plutôt que déduits du modèle des dés. -->
      <div v-if="turn" ref="cardEl" class="zone-card">
        <PirateCard :card="turn.card" :skulls="skulls" />
      </div>

      <!-- Dés en jeu : au centre du plateau. Ils sont égrenés au lancer — huit
           dés partant au cordeau ressembleraient à un seul objet. -->
      <div v-if="turn" class="zone-center">
        <div
          v-for="(d, i) in centerDice"
          :key="d.id"
          class="die-cell die-cell--big"
          :class="{ 'die-cell--held': heldDie === d.id, grabbable: clickable }"
          :style="scatterStyle(d.id)"
          @pointerdown="clickable && grab(d.id, $event)"
        >
          <DieView
            :die="d"
            :clickable="clickable"
            :roll="rollSeq"
            motion="roll"
            :travel="DICE_THROW.travel"
            :heading="headingFor(i, centerDice.length)"
            :delay="i * DICE_THROW.stagger"
            :duration="DICE_THROW.duration"
            :silent="i > 0"
            @click="toggleDie(d.id)"
          />
        </div>
      </div>

      <!-- Emplacements du bas. `data-slot` est ce que le glissé cherche sous le
           pointeur : le joueur choisit SA case, et peut regrouper ses dés. -->
      <div v-if="turn" class="zone-slots">
        <div
          v-for="i in 8"
          :key="i"
          class="die-cell"
          :class="{
            'die-cell--target': hovered === i - 1,
            'die-cell--held': heldDie !== null && heldDie === slotDice[i - 1]?.id,
            grabbable: clickable && !!slotDice[i - 1]
          }"
          :data-slot="i - 1"
          @pointerdown="slotDice[i - 1] && clickable && grab(slotDice[i - 1]!.id, $event)"
        >
          <DieView
            v-if="slotDice[i - 1]"
            :die="slotDice[i - 1]!"
            :clickable="clickable"
            :rescuable="guardianOffered && slotDice[i - 1]!.face === 'skull'"
            :selected="slotDice[i - 1]!.id !== guardianDie"
            seated
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

      <!-- Indice : sous les slots -->
      <p v-if="turn && !isBotTurn && turn.phase === 'decision'" class="zone-hint">
        <span v-if="transient" class="danger-txt">⛔ {{ transient }}</span>
        <span v-else-if="guardianDie !== null" class="guardian-txt">
          🗝 Tête de mort confiée à la Gardienne — elle repartira à la relance.
        </span>
        <span v-else-if="guardianOffered" class="guardian-txt">
          🗝 Gardienne : clique une tête de mort pour la relancer, une fois dans le tour.
        </span>
        <span v-else-if="isTreasure">
          Île au Trésor : les dés que tu gardes sont réservés sur la carte — reclique pour les reprendre.
        </span>
        <span v-else>Sélectionne les dés que tu veux GARDER, puis relance les autres — ou arrête-toi.</span>
      </p>
      <p v-else-if="turn && !isBotTurn && turn.phase === 'island-roll'" class="zone-hint">
        Île de la Tête-de-Mort : relance forcée tant que des têtes sortent.
      </p>
      <p v-else-if="turn && !isBotTurn && canRoll" class="zone-hint">Lance les dés</p>

      <!-- Île de la Tête-de-Mort : la lumière du plateau tourne au braise. La
           phase la plus dangereuse du jeu ne se distinguait par rien. -->
      <IslandAmbience v-if="isIsland" />
    </div>
  </div>

  <!-- Overlays ─────────────────────────────────────────────────────────────── -->
  <!-- La main revient : on le dit, sans rien bloquer. -->
  <TurnCall v-if="announcing && mode === 'playing'" />
  <!-- Résultat du tour : en grand, par-dessus le plateau, sans rien masquer et
       sans rien demander. `turn.outcome` est nul après un minuteur expiré sans
       le moindre lancer — il n'y a alors rien à annoncer, on enchaîne. -->
  <TurnFlash v-if="mode === 'turnEnd' && turn?.outcome" :outcome="turn.outcome" :actor="turnActor" />

  <GameOverModal
    v-if="mode === 'finished'"
    :players="players"
    :winner="winner"
    :avatar-of="portraitOf"
    @replay="newGame(difficulty)"
    @menu="router.push('/')"
  />

  <!-- Le dé en main : le vrai cube, décollé du plateau et suspendu au pointeur.
       `Teleport` vers le body — `.plateau` piégerait un `position: fixed`. -->
  <Teleport to="body">
    <div v-if="heldFace" class="held" :style="{ left: `${at.x}px`, top: `${at.y}px` }">
      <DieCube :face="heldFace" :roll="0" />
    </div>
  </Teleport>

  <RulesModal v-if="showRules" @close="showRules = false" />

  <GameSettingsModal
    v-if="showSettings"
    @close="showSettings = false"
    @quit="leaveGame"
  />

  <ScalePoints />
  <!-- Sous le barème, comme un second onglet de dossier : d'où viennent les
       scores, et pourquoi un tour s'est mal terminé. -->
  <TurnLog :history="history" :players="players" />
  <!-- Défaite : le crâne du plateau ouvre des yeux rouges -->
  <div v-if="isDefeat">
    <SkullEyes />
    <!-- Pas d'`autoplay` : la lecture passe par le watcher, qui applique le
        réglage « Ambiance ». L'attribut jouerait le son même réglage coupé. -->
    <audio ref="darkLaughAudio" :src="darkLaugh" />
  </div>
</template>

<script setup lang="ts">
import type { BotDifficulty, DieFace } from '@rf/engine'
import layoutUrl from '~/assets/images/ui/layout-game.png'
import ctaUrl from '~/assets/images/ui/main-cta.webp'
import { Cog } from 'lucide-vue-next'
import stopSeal from '~/assets/images/ui/wax-seal-stop.webp'
import rulesIcon from '~/assets/images/ui/icon-rules.webp'
import darkLaugh from '~/assets/sounds/soundscrate-evil-chuckle-02.mp3'

const route = useRoute()
const router = useRouter()

/**
 * Le mode est lu UNE fois : il détermine qui fait autorité, et cela ne peut pas
 * changer en cours de partie. En solo le moteur tourne dans l'onglet ; en multi
 * c'est le serveur, et l'écran se contente de suivre.
 */
const isSolo = route.query.mode !== 'multi'
const room = useRoom()

const {
  TURN_SECONDS,
  secondsLeft,
  mode,
  difficulty,
  selected,
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
  roll,
  reroll,
  rollOrReroll,
  stop,
  toggleDie,
  continueGame,
  eligibleReroll,
  avatarOf,
  guardianDie,
  potentialScore
} = useGame(isSolo ? createLocalTransport() : createNetworkTransport(room))

/**
 * La Gardienne n'a de sens qu'affichée : sans indication, le joueur ignore
 * qu'il peut renvoyer une tête de mort — et perd un tour qu'il pouvait sauver.
 */
const guardianOffered = computed(
  () =>
    turn.value?.guardianAvailable === true &&
    turn.value?.phase === 'decision' &&
    isMySeat.value &&
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

const darkLaughAudio = ref<HTMLAudioElement | null>(null)
const showRules = ref(false)
const showSettings = ref(false)

/**
 * Quitter la partie. En multi, on FERME la connexion avant de partir : sans
 * cela le siège resterait occupé par un joueur qui ne reviendra pas, et la
 * table attendrait ses décisions jusqu'à expiration du minuteur.
 */
function leaveGame(): void {
  showSettings.value = false
  if (!isSolo) room.close()
  router.push('/')
}

const { sfxGain } = useSoundSettings()

/**
 * Table composée dans le lobby : si elle existe, on démarre directement avec cet
 * équipage et l'écran de choix est sauté. Sinon on retombe sur le solo par
 * défaut (Toi contre Le Corsaire), accessible depuis l'accueil.
 */
const tableSetup = useTableSetup()

onMounted(function openTable() {
  if (isSolo) {
    // Demander une partie n'est pas demander sa mise en place : à défaut de
    // table fraîchement composée, on repart sur la dernière jouée — et à
    // défaut de tout, sur l'équipage par défaut. Aucun écran intermédiaire.
    const setup = tableSetup.value ?? lastSoloSetup()
    if (setup?.roster.length) rememberSoloSetup(setup)
    newGame(setup?.difficulty ?? 'medium', setup?.roster)
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
 * transporte pas les avatars, qui ne regardent pas les règles. On lit `roster`
 * et non `lobby` : le premier survit à un rechargement en pleine partie, où
 * plus aucune vue de salle n'est émise.
 */
function portraitOf(playerId: string): string | undefined {
  if (isSolo) return avatarOf(playerId)
  return room.roster.value.find((s) => s.id === playerId)?.avatar || undefined
}

/**
 * En multi, tant que le serveur n'a rien envoyé, il n'y a pas de table à
 * dessiner. En solo la question ne se pose pas : le moteur répond tout de suite.
 */
const waitingForTable = computed(() => !isSolo && !turn.value)

// ── Perspective des dés ──────────────────────────────────────────────────────
const plateauEl = ref<HTMLElement | null>(null)
const cardEl = ref<HTMLElement | null>(null)

/**
 * Chaque dé prend l'inclinaison de SA place sur le plateau (cf. `boardTilt`).
 *
 * On écrit la variable directement sur le DOM, sans passer par une donnée
 * réactive : la position d'un dé est une conséquence de la mise en page, or
 * relire la mise en page pour en refaire un rendu qui la modifierait tournerait
 * en rond. On lit tout, PUIS on écrit tout, pour ne pas faire recalculer la
 * mise en page à chaque dé.
 */
function applyBoardTilt(): void {
  const plateau = plateauEl.value
  if (!plateau) return
  const board = plateau.getBoundingClientRect()
  if (!board.width) return

  // Les dés seulement : la carte et les points ont une place fixe, donc des
  // angles fixes (cf. `boardZones`). Seul ce qui BOUGE a besoin d'être recalculé.
  const cells = [...plateau.querySelectorAll<HTMLElement>('.die-cell')]
  const tilts = cells.map((cell) => {
    const box = cell.getBoundingClientRect()
    return boardTilt(
      (box.left + box.width / 2 - board.left) / board.width,
      (box.top + box.height / 2 - board.top) / board.height,
      BOARD_PERSPECTIVE,
      // Les dés des huit cadres ne se règlent pas comme ceux jetés sur la
      // table : petits et encastrés, ils demandent leur propre dosage.
      { kind: cell.closest('.zone-slots') ? 'seated' : 'die' }
    )
  })
  cells.forEach((cell, i) => {
    cell.style.setProperty('--die-tilt-x', `${tilts[i]!.x}deg`)
    cell.style.setProperty('--die-tilt-y', `${tilts[i]!.y}deg`)
    cell.style.setProperty('--die-tilt-z', `${tilts[i]!.z}deg`)
  })

  // La carte, elle, n'est pas inclinée mais PROJETÉE sur les quatre coins du
  // cadre dessiné : aucune rotation ne peut égaler un quadrilatère quelconque.
  if (cardEl.value) applyQuad(cardEl.value, CARD_QUAD)
}

// Les dés se déplacent à chaque rendu — un dé gardé quitte le centre pour un
// cadre —, et le plateau se redimensionne avec la fenêtre.
onUpdated(applyBoardTilt)
onMounted(() => {
  applyBoardTilt()
  window.addEventListener('resize', applyBoardTilt)
})
onBeforeUnmount(() => window.removeEventListener('resize', applyBoardTilt))

const skulls = computed(() => {
  const t = turn.value
  if (!t) return 0
  return t.dice.filter((d) => d.face === 'skull').length + (t.card.type === 'skulls' ? t.card.count : 0)
})
const isBotTurn = computed(() => !!currentPlayer.value?.bot)

/**
 * Sur l'Île : la relance est forcée tant que des têtes sortent, et chaque tête
 * coûte des points à TOUS les adversaires. C'est la phase à faire sentir.
 */
const isIsland = computed(() => turn.value?.phase === 'island-roll')

/** Tour perdu : les yeux du crâne du plateau s'embrasent. */
const isDefeat = computed(function detectDefeat() {
  const reason = turn.value?.outcome?.reason
  return reason === 'three-skulls' || reason === 'skull-island'
})
/**
 * Le siège actif est-il le MIEN ? En solo, tout siège non-IA l'est. En multi, il
 * faut le comparer à mon identifiant : sans ça, chaque joueur verrait ses
 * boutons actifs pendant le tour des autres, et le serveur devrait refuser des
 * actions que l'écran n'aurait jamais dû proposer.
 */
const isMySeat = computed(() => (isSolo ? !isBotTurn.value : currentPlayer.value?.id === room.youId.value))

/**
 * « À toi de jouer », le temps d'un clin d'œil au début de NOTRE tour.
 *
 * Le déclencheur est la phase qui repasse à `first-roll` : c'est la seule
 * marque d'un tour qui s'OUVRE. Se fier au changement de joueur courant
 * l'afficherait trop tôt — la rotation a lieu à la fin du tour précédent,
 * pendant que son résultat est encore à l'écran.
 */
const TURN_CALL_MS = 2_500
const announcing = ref(false)
let callTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => turn.value?.phase,
  (phase, before) => {
    if (phase !== 'first-roll' || phase === before) return
    if (!isMySeat.value || gamePhase.value === 'finished') return
    if (callTimer) clearTimeout(callTimer)
    announcing.value = true
    callTimer = setTimeout(() => (announcing.value = false), TURN_CALL_MS)
  }
)

onBeforeUnmount(() => {
  if (callTimer) clearTimeout(callTimer)
})

/** Les cachets restent affichés en permanence ; ils sont grisés hors de notre tour. */
const myTurn = computed(() => isMySeat.value && !rolling.value && turn.value?.phase !== 'ended')
// En phase de décision, le cachet ne s'allume que si la relance est LÉGALE :
// au moins deux dés à relancer, et au moins un dé gardé.
const canRoll = computed(() => {
  if (!myTurn.value) return false
  const phase = turn.value?.phase ?? ''
  if (phase === 'first-roll' || phase === 'island-roll') return true
  return phase === 'decision' && eligibleReroll().length > 0
})
const canStop = computed(() => myTurn.value && turn.value?.phase === 'decision')
const clickable = computed(() => isMySeat.value && turn.value?.phase === 'decision')
const isTreasure = computed(() => turn.value?.card.type === 'treasure-island')
const rerollCount = computed(() => eligibleReroll().length)

/**
 * Centre = dés encore en jeu (ils repartiront à la relance).
 * Slots du bas = dés GARDÉS : ceux choisis par le joueur, plus les têtes de mort
 * (verrouillées, donc gardées d'office) et les dés réservés de l'Île au Trésor.
 */
// Une tête de mort verrouillée PENDANT que la volée est en l'air reste au
// centre : elle vient d'être jetée, elle doit rouler avec les autres. Elle
// rejoindra la rangée en retombant. Sans cela, la seule face qu'on veut voir
// tomber serait justement celle qui saute directement dans son cadre.
/**
 * Les dés encore SANS face restent de la partie, invisibles : leur composant
 * doit exister avant le premier jet du tour, sinon ce jet-là apparaîtrait tout
 * posé au lieu de rouler comme les suivants.
 */
const centerDice = computed(() =>
  turn.value ? turn.value.dice.filter((d) => !keptIds.value.includes(d.id)) : []
)

/**
 * Un dé par emplacement, à SA place — et non les dés gardés tassés à gauche.
 * C'est `slots` qui mémorise le rangement choisi, sans quoi un glisser-déposer
 * n'aurait rien à déplacer.
 */
const slotDice = computed(() =>
  slots.value.map((id) => (id === null ? null : (turn.value?.dice[id] ?? null)))
)

/**
 * Où chaque dé s'immobilise, et comment il est tourné.
 *
 * La grille place les dés ; ceci les DÉRANGE. Sans elle, ils roulent bien mais
 * retombent au cordeau sur leurs cases, ce qui trahit l'animation — une poignée
 * de dés jetée s'éparpille.
 *
 * `translate` et `rotate` séparément, jamais `transform` : celui-ci aplatirait
 * la scène 3D des cubes (cf. `CLAUDE.md`). Le tirage est reproductible, indexé
 * sur le numéro du jet : au hasard à chaque rendu, les dés vibreraient à chaque
 * seconde du minuteur.
 */
function scatterStyle(dieId: number): Record<string, string> {
  const { x, y, angle } = scatterFor(dieId, rollSeq.value)
  return { translate: `${x}% ${y}%`, rotate: `${angle}deg` }
}

// ── Saisir un dé ─────────────────────────────────────────────────────────────
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
// Le libellé est posé SUR l'icône : le débordement est assumé, il donne au
// bouton l'allure d'un cachet plutôt que d'une vignette légendée.
.zone-action-layout {
  position: absolute;
  top: 2.5%;
  right: 2%;
  z-index: 2;
  display: flex;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition: transform 0.12s ease;
  .btn {
    background-color: transparent;
    box-shadow: none;
    &:hover {
      transform: scale(1.06);
    }
  }
  &__rules {
    &__icon {
      grid-area: 1 / 1;
      width: 5cqw;
      height: auto;
      filter: drop-shadow(0 2px 4px rgba(24, 14, 8, 0.8));
    }
  }
}

// Bandeau des joueurs, collé au bord bas du plateau. Il défile en LARGEUR et
// non en hauteur : la table monte à huit, et une rangée qui déborde vaut mieux
// qu'une colonne qui grimpe sur les emplacements de dés.
.zone-players {
  position: absolute;
  left: 0;
  bottom: 0.8%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 0.8cqw;
  padding: 0 1cqw;
  overflow-x: auto;
  // La barre de défilement mangerait la hauteur utile d'une carte.
  scrollbar-width: none;

  .gamer-wrapper {
    flex: 0 1 12cqw;
    min-width: 8cqw;
    max-width: 12cqw;
  }
}
// Cadre de la carte, mesuré sur le nouveau décor (1672×941) : liseré doré à
// x 1275..1550 en haut, 1289..1571 en bas, y 261..659. Le cadre n'est pas
// d'aplomb — il PENCHE, comme tout ce que ce grand angle a photographié —, d'où
// le léger retrait : on se cale au milieu du quadrilatère, et c'est la
// rotation ci-dessous qui rattrape l'inclinaison.
// Place, taille et inclinaison viennent de `CARD_ZONE` (app/utils/boardZones.ts),
// posées en style en ligne : elles se règlent à l'œil dans le labo, et le CSS
// n'a plus qu'à savoir COMMENT appliquer une inclinaison, pas laquelle.
// Place et forme viennent de `CARD_QUAD` : `applyQuad` pose la boîte englobante
// puis la matrice qui l'envoie sur les quatre coins du cadre dessiné. L'origine
// doit être le coin haut-gauche — la matrice part de là, pas du centre.
.zone-card {
  position: absolute;
  transform-origin: 0 0;

  > * {
    width: 100%;
    height: 100%;
  }
}

// Points en jeu, juste au-dessus du cadre : le joueur doit arbitrer « je
// relance ou j'encaisse » sans quitter la carte des yeux. Même largeur et même
// inclinaison que la carte, sinon les deux blocs ne semblent pas posés sur la
// même table.
.zone-live {
  position: absolute;
  z-index: 2;
  perspective: 90cqw;

  > * {
    transform: rotateZ(var(--tilt-z, 0deg)) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
  }
}

// Dés en jeu, au centre. Bornes du bois libre sur le nouveau décor : sous les
// lanternes, au-dessus de la rangée d'emplacements, à gauche du cadre de carte.
.zone-center {
  position: absolute;
  left: 19%;
  top: 22%;
  width: 55%;
  height: 42%;
  display: flex;
  flex-wrap: wrap;
  gap: 1.4cqw;
  align-content: center;
  justify-content: center;
}
// Le dé porte sa propre taille : `--die-size` descend jusqu'au cube, qui en
// tire la profondeur de ses faces (translateZ = la moitié). Une longueur, donc,
// jamais un pourcentage.
.die-cell--big {
  --die-size: 5cqw;
  width: var(--die-size);
  height: var(--die-size);
}

// ── Saisir un dé ────────────────────────────────────────────────────────────
// `touch-action: none` : sans lui, un glissé au doigt fait défiler la page au
// lieu de déplacer le dé. `user-select` écarte la sélection de texte, qui
// parasiterait le geste à la souris.
.die-cell {
  display: grid;
  place-items: center;
  touch-action: none;
  user-select: none;
}

// Le dé saisi laisse un creux à sa place, pour qu'on voie d'où il vient.
.die-cell--held {
  opacity: 0.25;
}

// Cadre visé : il s'allume avant le lâcher, sinon on dépose à l'aveugle.
.die-cell--target::after {
  content: '';
  position: absolute;
  inset: -6%;
  border: 0.25cqw solid var(--accent-hi);
  border-radius: 10%;
  box-shadow: 0 0 1.2cqw rgba(232, 196, 104, 0.55);
  pointer-events: none;
}

.zone-slots .die-cell {
  position: relative;
}

// Le dé en main, suspendu au pointeur. Taille en pixels et non en `cqw` : il
// vit dans le body, hors du conteneur qu'est le plateau.
.held {
  position: fixed;
  z-index: 90;
  --die-size: 76px;

  // Pas de `filter` ici, si tentant soit-il pour une ombre portée : il
  // aplatirait la scène 3D du cube. Le dé porte déjà son ombre au sol.
  translate: -50% -50%;
  pointer-events: none;
}

// Rangée d'emplacements du nouveau décor, mesurée sur l'image (1672×941) :
// cadres x 413..1242, y 652..748 ; largeur d'un cadre 91 px, pas de 105,6 px.
// L'écart de 14,6 px se rapporte à la LARGEUR DE LA RANGÉE (829 px) et non au
// plateau — c'est ce que fait `gap` en pourcentage : 14,6 / 829 = 1,76 %.
.zone-slots {
  position: absolute;
  left: 24.7%;
  top: 69.29%;
  width: 49.58%;
  height: 10.2%;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 1.76%;
  place-items: center;
}
// Dés réservés : nettement plus petits que leur cadre (91 px = 5,44 cqw). Le
// liseré doré du décor doit rester visible tout autour, sinon le dé a l'air
// posé DEVANT son logement plutôt que dedans.
.zone-slots .die-cell {
  --die-size: 4.3cqw;
  --die-seat-drop: 0%;
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

// L'indice remonte dans la bande libre entre les dés (qui s'arrêtent à 64 %) et
// la rangée d'emplacements (qui commence à 69,3 %). Le bas du plateau revient
// aux cartes joueurs, qu'il recouvrait.
.zone-hint {
  position: absolute;
  left: 50%;
  top: 64.6%;
  translate: -50% 0;
  width: 52%;
  text-align: center;
  color: var(--parchment, #ede0c8);
  font-size: 1.25cqw;
  font-weight: 300;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  // Une phrase d'aide ne doit jamais intercepter un dé qu'on fait glisser.
  pointer-events: none;
}
.danger-txt {
  color: var(--danger-edge);
  font-weight: 600;
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
