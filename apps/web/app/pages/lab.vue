<template>
  <div class="lab">
    <header class="lab__head">
      <h1 class="lab__title">Labo — animation des dés</h1>
      <NuxtLink to="/" class="lab__back">← accueil</NuxtLink>
    </header>

    <p class="lab__intro">
      Prototype isolé : le cube 3D CSS tombe sur une face <strong>imposée</strong>, comme le fera le vrai jeu
      où le moteur (ou le serveur) a déjà tiré le résultat. Cliquer le dé le relance.
    </p>

    <!-- Comparaison : le cube d'un côté, la tuile plate actuelle de l'autre. -->
    <section class="lab__stage">
      <div class="lab__seat">
        <div
          class="lab__die"
          role="button"
          tabindex="0"
          aria-label="relancer le dé"
          @click="rollSingle()"
          @keydown.enter.prevent="rollSingle()"
          @keydown.space.prevent="rollSingle()"
        >
          <DieCube
            :face="single.face"
            :roll="single.roll"
            :duration="duration"
            :turns="turns"
            :tilt-x="tiltX"
            :tilt-y="tiltY"
            :art-scale="artScale"
            :silent="!sound"
          />
        </div>
        <p class="lab__caption">cube 3D — {{ single.face }}</p>
      </div>

      <div class="lab__seat">
        <div class="lab__tile">
          <DieView :die="{ id: 0, face: single.face, locked: false, banked: false }" />
        </div>
        <p class="lab__caption">tuile plate — rendu actuel du plateau</p>
      </div>
    </section>

    <!-- Face imposée : c'est la contrainte à démontrer, elle vient en premier. -->
    <section class="lab__panel">
      <h2 class="lab__legend">Tomber sur</h2>
      <div class="lab__faces">
        <button
          v-for="face in FACES"
          :key="face"
          v-click-sound
          type="button"
          class="lab__face"
          :class="{ 'lab__face--on': single.face === face }"
          @click="rollSingle(face)"
        >
          {{ FACE_LABEL[face] }}
        </button>
        <button v-click-sound type="button" class="lab__face" @click="rollSingle()">au hasard</button>
      </div>
    </section>

    <section class="lab__panel">
      <h2 class="lab__legend">Réglages</h2>
      <div class="lab__knobs">
        <label class="lab__knob">
          <span
            >Durée du vol <b>{{ duration }} ms</b></span
          >
          <input v-model.number="duration" type="range" min="400" max="2400" step="50" />
        </label>
        <label class="lab__knob">
          <span
            >Tours minimum <b>{{ turns }}</b></span
          >
          <input v-model.number="turns" type="range" min="1" max="5" step="1" />
        </label>
        <label class="lab__knob">
          <span
            >Inclinaison au repos — X <b>{{ tiltX }}°</b></span
          >
          <input v-model.number="tiltX" type="range" min="-35" max="35" step="1" />
        </label>
        <label class="lab__knob">
          <span
            >Inclinaison au repos — Y <b>{{ tiltY }}°</b></span
          >
          <input v-model.number="tiltY" type="range" min="-35" max="35" step="1" />
        </label>
        <label class="lab__knob">
          <span
            >Échelle de la tuile <b>{{ artScale.toFixed(2) }}×</b></span
          >
          <input v-model.number="artScale" type="range" min="1" max="1.8" step="0.01" />
        </label>
        <label class="lab__knob lab__knob--check">
          <input v-model="sound" type="checkbox" />
          <span>Bruitage</span>
        </label>
      </div>
      <p class="lab__hint">
        Inclinaison à 0/0 : la face demandée est bien à plat, très lisible, mais le dé redevient un carré.
        Autour de −14/−18, il reste un objet en volume.
      </p>
    </section>

    <!-- Réglage de la perspective, SUR le vrai décor : c'est le seul endroit où
         l'on peut juger si un dé est posé sur la table ou flotte au-dessus. -->
    <!-- UNE seule maquette pour tout le plateau : dés, emplacements, carte,
         points et ambiance. Deux vues séparées obligeaient à régler chaque
         élément sans voir ce que faisaient les autres, alors que c'est
         justement leur cohabitation qu'on juge. -->
    <section class="lab__panel">
      <h2 class="lab__legend">Le plateau</h2>
      <div ref="boardEl" class="lab__board" :style="{ backgroundImage: `url(${layoutUrl})` }">
        <div class="lab__board-center">
          <div v-for="(die, i) in board" :key="i" class="lab__board-cell">
            <DieCube :face="die.face" :roll="die.roll" :duration="duration" :silent="i > 0" />
          </div>
        </div>
        <div class="lab__board-slots">
          <div
            v-for="i in 8"
            :key="i"
            class="lab__board-slot"
            :style="{ '--die-seat-drop': `${seatDrop}%`, '--die-size': `${seatSize}cqw` }"
          >
            <DieCube :face="slots[i - 1]!.face" :roll="0" seated />
          </div>
        </div>

        <div class="lab__zone lab__zone--live" :style="zoneStyle(live)">
          <LiveScore :score="500" />
        </div>
        <div ref="quadCardEl" class="lab__quad">
          <PirateCard :card="{ type: 'guardian' }" :skulls="1" />
        </div>

        <!-- Une poignée par coin : on les pose sur ceux du cadre dessiné, et la
             carte y entre exactement. Régler quatre points à la souris bat
             n'importe quel jeu de curseurs d'angles. -->
        <button
          v-for="corner in CORNERS"
          :key="corner"
          type="button"
          class="lab__handle"
          :class="{ 'lab__handle--held': held === corner }"
          :style="{ left: `${quad[corner].x}%`, top: `${quad[corner].y}%` }"
          :aria-label="`Coin ${corner}`"
          @pointerdown="grab(corner, $event)"
        />

        <IslandAmbience
          v-if="island"
          :style="{
            '--island-hue': `${islandHue}deg`,
            '--island-saturation': islandSaturation,
            '--island-brightness': islandBrightness
          }"
        />
      </div>

      <!-- Le plateau reste sous les yeux, les réglages changent dessous : c'est
           tout l'objet des onglets. Corriger une teinte d'un degré ne doit pas
           demander de faire l'aller-retour jusqu'en bas de page. -->
      <nav class="lab__tabs">
        <button
          v-for="t in TABS"
          :key="t.key"
          v-click-sound
          type="button"
          class="lab__tab"
          :class="{ 'lab__tab--on': tab === t.key }"
          :aria-pressed="tab === t.key"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </nav>

      <div v-show="tab === 'dice'" class="lab__knobs">
        <label class="lab__knob">
          <span
            >Convergence au bord (yaw) <b>{{ perspective.yaw }}°</b></span
          >
          <input v-model.number="perspective.yaw" type="range" min="0" max="50" step="0.5" />
        </label>
        <label class="lab__knob">
          <span
            >Plongée en HAUT du plateau <b>{{ perspective.pitchTop }}°</b></span
          >
          <input v-model.number="perspective.pitchTop" type="range" min="0" max="25" step="0.5" />
        </label>
        <label class="lab__knob">
          <span
            >Plongée en BAS du plateau <b>{{ perspective.pitchBottom }}°</b></span
          >
          <input v-model.number="perspective.pitchBottom" type="range" min="0" max="25" step="0.5" />
        </label>
        <label class="lab__knob">
          <span
            >Roulis au bord <b>{{ perspective.roll }}°</b></span
          >
          <input v-model.number="perspective.roll" type="range" min="-30" max="30" step="0.5" />
        </label>
        <label class="lab__knob">
          <span
            >Relief des dés rangés <b>×{{ perspective.seatedRelief }}</b></span
          >
          <input v-model.number="perspective.seatedRelief" type="range" min="-3" max="3" step="0.05" />
        </label>
        <label class="lab__knob">
          <span
            >Enfoncement dans le cadre <b>{{ seatDrop }} %</b></span
          >
          <input v-model.number="seatDrop" type="range" min="0" max="16" step="0.5" />
        </label>
        <label class="lab__knob">
          <span
            >Taille des dés rangés <b>{{ seatSize }} cqw</b></span
          >
          <input v-model.number="seatSize" type="range" min="3.2" max="5.4" step="0.1" />
        </label>
      </div>
      <template v-if="tab === 'dice'">
        <PlateButton @click="rollBoard">Lancer sur le plateau</PlateButton>

        <!-- Le labo ne sert à rien s'il faut ensuite retranscrire les valeurs à
             la main : il rend directement le morceau de code à coller. -->
        <p class="lab__hint">
          Quand ça te va, colle ceci dans <code>BOARD_PERSPECTIVE</code> (<code>app/utils/boardTilt.ts</code>)
          — le plateau le reprend tel quel. Les deux dernières valeurs sont en CSS, dans
          <code>pages/game.vue</code>.
        </p>
        <pre class="lab__code">{{ recipe }}</pre>
      </template>

      <!-- La carte et les points ont une place FIXE dans le décor : leurs angles
           se donnent en clair, ils ne se déduisent pas du modèle des dés. -->
      <div v-show="tab === 'card'" class="lab__knobs">
        <button
          v-for="z in ZONES"
          :key="z.key"
          v-click-sound
          type="button"
          class="lab__face"
          :class="{ 'lab__face--on': tuned === z.key }"
          @click="tuned = z.key"
        >
          {{ z.label }}
        </button>
      </div>

      <template v-if="tab === 'card'">
        <div class="lab__knobs">
          <label v-for="k in ZONE_KNOBS" :key="k.field" class="lab__knob">
            <span>
              {{ k.label }} <b>{{ current[k.field] }}{{ k.unit }}</b>
            </span>
            <input v-model.number="current[k.field]" type="range" :min="k.min" :max="k.max" :step="k.step" />
          </label>
        </div>
        <p class="lab__hint">
          Les quatre premiers curseurs placent le bloc dans son cadre, les trois derniers l'y couchent. Pour
          aligner les arêtes sur le cadre dessiné, commence par le <strong>roulis</strong> seul, les autres à
          0.
        </p>
        <label class="lab__knob lab__knob--check">
          <input v-model="fitted" type="checkbox" />
          <span>Carte posée dans le cadre (décochée : carte redressée)</span>
        </label>
        <p class="lab__hint">
          Les illustrations ne sont jamais retouchées : la déformation est calculée à l'affichage, et se
          retire en décochant. Rien à refaire, jamais.
        </p>

        <pre class="lab__code">{{ quadRecipe }}</pre>
        <pre class="lab__code">{{ zoneRecipe }}</pre>
      </template>

      <!-- L'Île sort rarement au tirage : on ne peut pas juger son ambiance en
           attendant qu'elle tombe. -->
      <template v-if="tab === 'island'">
        <label class="lab__knob lab__knob--check">
          <input v-model="island" type="checkbox" />
          <span>Allumer l’ambiance sur le plateau ci-dessus</span>
        </label>

        <div class="lab__knobs">
          <label class="lab__knob">
            <span
              >Rotation de teinte <b>{{ islandHue }}°</b></span
            >
            <input v-model.number="islandHue" type="range" min="-180" max="180" step="1" />
          </label>
          <label class="lab__knob">
            <span
              >Saturation <b>×{{ islandSaturation }}</b></span
            >
            <input v-model.number="islandSaturation" type="range" min="0" max="3" step="0.05" />
          </label>
          <label class="lab__knob">
            <span
              >Luminosité <b>×{{ islandBrightness }}</b></span
            >
            <input v-model.number="islandBrightness" type="range" min="0.3" max="1.5" step="0.02" />
          </label>
        </div>
        <p class="lab__hint">
          Le décor garde son image : c'est un <code>backdrop-filter</code>, il retouche ce qui est déjà
          dessiné dessous. Un <code>filter</code>
          aplatirait la scène 3D des dés.
        </p>
        <pre class="lab__code">{{ islandRecipe }}</pre>
      </template>
    </section>

    <!-- La question du moment : rouler, ou culbuter sur place. Côte à côte,
         sur la même piste, pour que la différence saute aux yeux. -->
    <section class="lab__panel">
      <h2 class="lab__legend">Rouler vs culbuter</h2>
      <div class="lab__track">
        <div class="lab__lane">
          <p class="lab__caption">Roulé — il tourne parce qu'il avance</p>
          <div class="lab__runner">
            <DieCube
              :face="race.face"
              :roll="race.roll"
              motion="roll"
              :duration="throwing.duration"
              :travel="throwing.travel"
              :heading="throwing.heading"
              :silent="!sound"
            />
          </div>
        </div>
        <div class="lab__lane">
          <p class="lab__caption">Culbute sur place — l'animation actuelle</p>
          <div class="lab__runner">
            <DieCube
              :face="race.face"
              :roll="race.roll"
              :duration="throwing.duration"
              :turns="turns"
              silent
            />
          </div>
        </div>
      </div>

      <div class="lab__knobs">
        <label class="lab__knob">
          <span
            >Distance parcourue <b>{{ throwing.travel }} côtés</b></span
          >
          <input v-model.number="throwing.travel" type="range" min="1" max="16" step="1" />
        </label>
        <label class="lab__knob">
          <span
            >Direction <b>{{ throwing.heading }}°</b></span
          >
          <input v-model.number="throwing.heading" type="range" min="-180" max="180" step="1" />
        </label>
        <label class="lab__knob">
          <span
            >Durée <b>{{ throwing.duration }} ms</b></span
          >
          <input v-model.number="throwing.duration" type="range" min="400" max="2600" step="50" />
        </label>
        <label class="lab__knob">
          <span
            >Écart entre les dés <b>{{ throwing.spread }}°</b></span
          >
          <input v-model.number="throwing.spread" type="range" min="0" max="120" step="2" />
        </label>
        <label class="lab__knob">
          <span
            >Décalage de départ <b>{{ throwing.stagger }} ms</b></span
          >
          <input v-model.number="throwing.stagger" type="range" min="0" max="200" step="5" />
        </label>
      </div>
      <PlateButton @click="rollRace">Lancer les deux</PlateButton>
      <p class="lab__hint">
        La distance est en <strong>côtés de dé</strong>, et c'est volontaire : un cube fait exactement un
        quart de tour par côté parcouru. C'est ce rapport qui fait « rouler » — le nombre de tours ne se règle
        plus, il se déduit du trajet. L'<strong>écart</strong>, lui, ne se juge que sur la volée de huit, plus
        bas : à zéro, les dés arrivent tous sur le même vecteur.
      </p>
      <pre class="lab__code">{{ throwRecipe }}</pre>
    </section>

    <!-- Le vrai test du plateau : huit dés, égrenés, à la taille réelle. -->
    <section class="lab__panel">
      <h2 class="lab__legend">Volée de huit — comme au plateau</h2>
      <div class="lab__volley">
        <DieCube
          v-for="(die, i) in volley"
          :key="i"
          class="lab__volley-die"
          :face="die.face"
          :roll="die.roll"
          motion="roll"
          :duration="throwing.duration"
          :travel="throwing.travel"
          :heading="headingFor(i, volley.length, throwing)"
          :delay="i * throwing.stagger"
          :tilt-x="tiltX"
          :tilt-y="tiltY"
          :art-scale="artScale"
          :silent="!sound || i > 0"
        />
      </div>
      <div class="lab__knobs">
        <label class="lab__knob">
          <span
            >Décalage entre dés <b>{{ stagger }} ms</b></span
          >
          <input v-model.number="stagger" type="range" min="0" max="220" step="10" />
        </label>
      </div>
      <PlateButton @click="rollVolley">Lancer les 8</PlateButton>
    </section>

    <section class="lab__panel">
      <h2 class="lab__legend">Joueur</h2>
      <div class="gamers-list">
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" />
        </div>
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" current />
        </div>
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" />
        </div>
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" />
        </div>
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" />
        </div>
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" />
        </div>
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" />
        </div>
        <div class="gamer-wrapper">
          <GamerSlot size="100%" :player="player" :avatar="avatarUrl" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Page bac à sable, hors du jeu : elle sert à trancher une question de
 * direction artistique — le cube 3D remplace-t-il la tuile plate ? — avant de
 * toucher au plateau. Rien ici ne doit être réutilisé tel quel.
 */
import { FACES, type DieFace, type Player } from '@rf/engine'
import layoutUrl from '~/assets/images/ui/layout-game.png'
import avatarUrl from '~/assets/images/character/chara_pirate.webp'

const { musicEnabled } = useSoundSettings()
musicEnabled.value = false

const FACE_LABEL: Record<DieFace, string> = {
  sabre: 'sabre',
  skull: 'tête de mort',
  monkey: 'singe',
  parrot: 'perroquet',
  coin: 'pièce',
  diamond: 'diamant'
}

const player: Player = {
  id: 'xxx',
  name: 'Barbossa',
  score: 3900,
  bot: false
}

const duration = ref(1100)
const turns = ref(2)
const tiltX = ref(-14)
const tiltY = ref(-18)
const artScale = ref(1.57)
const sound = ref(true)
const stagger = ref(70)

function draw(): DieFace {
  return FACES[Math.floor(Math.random() * FACES.length)]!
}

const single = reactive({ face: draw(), roll: 0 })

/**
 * Sans argument, on tire une face au hasard : c'est le cas réel, où le résultat
 * tombe d'ailleurs. Avec un argument, on force la face pour vérifier à l'œil
 * que le dé atterrit VRAIMENT dessus, y compris deux fois de suite.
 */
function rollSingle(face?: DieFace): void {
  single.face = face ?? draw()
  single.roll += 1
}

const volley = reactive(Array.from({ length: 8 }, () => ({ face: draw(), roll: 0 })))

function rollVolley(): void {
  for (const die of volley) {
    die.face = draw()
    die.roll += 1
  }
}

// ── Perspective sur le vrai décor ────────────────────────────────────────────
/** Copie modifiable du réglage du jeu : on tourne les boutons sans rien casser. */
const perspective = reactive({ ...BOARD_PERSPECTIVE })
/** Les deux réglages qui vivent en CSS, et non dans le modèle de perspective. */
const seatDrop = ref(6)
const seatSize = ref(4.4)

/** Le réglage courant, prêt à coller — un labo qu'il faut recopier à la main ne sert à rien. */
const recipe = computed(
  () => `// app/utils/boardTilt.ts
export const BOARD_PERSPECTIVE: BoardPerspective = {
  yaw: ${perspective.yaw},
  pitchTop: ${perspective.pitchTop},
  pitchBottom: ${perspective.pitchBottom},
  roll: ${perspective.roll},
  seatedRelief: ${perspective.seatedRelief}
}

// app/pages/game.vue — .zone-slots .die-cell
--die-size: ${seatSize.value}cqw;
--die-seat-drop: ${seatDrop.value}%;`
)

const board = reactive(Array.from({ length: 8 }, () => ({ face: draw(), roll: 0 })))
const slots = reactive(Array.from({ length: 8 }, () => ({ face: draw() })))

function rollBoard(): void {
  for (const die of board) {
    die.face = draw()
    die.roll += 1
  }
}

// ── Carte et points : des blocs à place FIXE ─────────────────────────────────
/** Copies modifiables, pour tourner les boutons sans toucher au jeu. */
const card = reactive({ ...CARD_ZONE })
const live = reactive({ ...LIVE_ZONE, height: LIVE_ZONE.height ?? 8 })

const ZONES = [
  { key: 'card' as const, label: 'Carte Pirate' },
  { key: 'live' as const, label: 'Points en jeu' }
]
const tuned = ref<'card' | 'live'>('card')
const current = computed(() => (tuned.value === 'card' ? card : live))

/**
 * Les mêmes réglages pour les deux blocs : quatre pour la place, trois pour
 * l'inclinaison. Une table plutôt que quatorze curseurs écrits à la main — on
 * ne veut pas les corriger deux fois le jour où une borne change.
 */
const ZONE_KNOBS = [
  { field: 'left', label: 'Gauche', unit: ' %', min: 55, max: 95, step: 0.1 },
  { field: 'top', label: 'Haut', unit: ' %', min: 2, max: 70, step: 0.1 },
  { field: 'width', label: 'Largeur', unit: ' %', min: 5, max: 35, step: 0.1 },
  { field: 'height', label: 'Hauteur', unit: ' %', min: 3, max: 60, step: 0.1 },
  { field: 'tiltX', label: 'Plongée (X)', unit: '°', min: -30, max: 30, step: 0.5 },
  { field: 'tiltY', label: 'Lacet (Y)', unit: '°', min: -30, max: 30, step: 0.5 },
  { field: 'tiltZ', label: 'Roulis (Z)', unit: '°', min: -20, max: 20, step: 0.5 }
] as const

// ── Les quatre coins de la carte, réglés à la souris ─────────────────────────
const CORNERS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const

const quad = reactive({
  topLeft: { ...CARD_QUAD.topLeft },
  topRight: { ...CARD_QUAD.topRight },
  bottomRight: { ...CARD_QUAD.bottomRight },
  bottomLeft: { ...CARD_QUAD.bottomLeft }
})

const quadCardEl = ref<HTMLElement | null>(null)
const held = ref<(typeof CORNERS)[number] | null>(null)

function grab(corner: (typeof CORNERS)[number], event: PointerEvent): void {
  held.value = corner
  // La capture suit le pointeur même sorti de la poignée : sans elle, un geste
  // un peu vif lâche le coin dès qu'on dépasse les quelques pixels du bouton.
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
}

function drag(event: PointerEvent): void {
  const corner = held.value
  const board = boardEl.value
  if (!corner || !board) return
  const box = board.getBoundingClientRect()
  quad[corner].x = round1(((event.clientX - box.left) / box.width) * 100)
  quad[corner].y = round1(((event.clientY - box.top) / box.height) * 100)
}

const round1 = (v: number): number => Math.round(v * 10) / 10
const release = (): void => void (held.value = null)

/**
 * Comparatif honnête : la carte redressée contre la carte posée dans le cadre.
 * Le seul moyen de trancher « est-ce que ça abîme mes illustrations ? » est de
 * voir les deux, pas d'en discuter.
 */
const fitted = ref(true)

function paintQuad(): void {
  const el = quadCardEl.value
  if (!el) return
  if (fitted.value) return applyQuad(el, quad)

  // Redressée : on garde la place, on jette la déformation.
  const bounds = quadBounds(quad)
  el.style.left = `${bounds.left}%`
  el.style.top = `${bounds.top}%`
  el.style.width = `${bounds.width}%`
  el.style.height = `${bounds.height}%`
  el.style.transform = 'none'
}

watch([quad, fitted], paintQuad, { flush: 'post', deep: true })
onMounted(() => {
  paintQuad()
  window.addEventListener('pointermove', drag)
  window.addEventListener('pointerup', release)
  window.addEventListener('resize', paintQuad)
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', drag)
  window.removeEventListener('pointerup', release)
  window.removeEventListener('resize', paintQuad)
})

const quadRecipe = computed(
  () => `// app/utils/boardZones.ts
export const CARD_QUAD: Quad = {
  topLeft: { x: ${quad.topLeft.x}, y: ${quad.topLeft.y} },
  topRight: { x: ${quad.topRight.x}, y: ${quad.topRight.y} },
  bottomRight: { x: ${quad.bottomRight.x}, y: ${quad.bottomRight.y} },
  bottomLeft: { x: ${quad.bottomLeft.x}, y: ${quad.bottomLeft.y} }
}`
)

const zoneRecipe = computed(
  () => `// app/utils/boardZones.ts
export const CARD_ZONE: BoardZone = {
  left: ${card.left}, top: ${card.top}, width: ${card.width}, height: ${card.height},
  tiltX: ${card.tiltX}, tiltY: ${card.tiltY}, tiltZ: ${card.tiltZ}
}

export const LIVE_ZONE: BoardZone = {
  left: ${live.left}, top: ${live.top}, width: ${live.width},
  tiltX: ${live.tiltX}, tiltY: ${live.tiltY}, tiltZ: ${live.tiltZ}
}`
)

/**
 * Les trois familles de réglage partagent le MÊME plateau, affiché au-dessus et
 * collé en haut de la fenêtre. Corriger une teinte d'un degré ne doit pas
 * demander un aller-retour jusqu'en bas de page pour en voir l'effet.
 */
const TABS = [
  { key: 'dice' as const, label: 'Dés' },
  { key: 'card' as const, label: 'Carte & points' },
  { key: 'island' as const, label: 'Ambiance de l’Île' }
]
const tab = ref<(typeof TABS)[number]['key']>('dice')

/** Ambiance de l'Île, allumée à la demande : elle sort trop rarement au tirage. */
const island = ref(false)
const islandHue = ref(-18)
const islandSaturation = ref(1.45)
const islandBrightness = ref(0.82)

const islandRecipe = computed(
  () => `// components/IslandAmbience.vue
--island-hue: ${islandHue.value}deg;
--island-saturation: ${islandSaturation.value};
--island-brightness: ${islandBrightness.value};`
)

// ── Rouler contre culbuter ───────────────────────────────────────────────────
/** Copie modifiable du réglage du jeu, pour tourner les boutons sans rien casser. */
const throwing = reactive({ ...DICE_THROW })
const race = reactive({ face: draw(), roll: 0 })

function rollRace(): void {
  race.face = draw()
  race.roll += 1
}

const throwRecipe = computed(
  () => `// app/utils/diceThrow.ts
export const DICE_THROW: DiceThrow = {
  travel: ${throwing.travel},
  heading: ${throwing.heading},
  duration: ${throwing.duration},
  spread: ${throwing.spread},
  stagger: ${throwing.stagger}
}`
)

const boardEl = ref<HTMLElement | null>(null)

/**
 * Même calcul que sur le plateau du jeu — délibérément la MÊME fonction : un
 * labo qui approximerait le rendu réel ne servirait à rien pour le régler.
 */
function applyTilt(): void {
  const plateau = boardEl.value
  if (!plateau) return
  const rect = plateau.getBoundingClientRect()
  if (!rect.width) return

  const cells = [...plateau.querySelectorAll<HTMLElement>('.lab__board-cell, .lab__board-slot')]
  const tilts = cells.map((cell) => {
    const box = cell.getBoundingClientRect()
    return boardTilt(
      (box.left + box.width / 2 - rect.left) / rect.width,
      (box.top + box.height / 2 - rect.top) / rect.height,
      perspective,
      { kind: cell.classList.contains('lab__board-slot') ? 'seated' : 'die' }
    )
  })
  cells.forEach((cell, i) => {
    cell.style.setProperty('--die-tilt-x', `${tilts[i]!.x}deg`)
    cell.style.setProperty('--die-tilt-y', `${tilts[i]!.y}deg`)
    cell.style.setProperty('--die-tilt-z', `${tilts[i]!.z}deg`)
  })
}

watch(perspective, applyTilt, { flush: 'post' })
onUpdated(applyTilt)
onMounted(() => {
  applyTilt()
  window.addEventListener('resize', applyTilt)
})
onBeforeUnmount(() => window.removeEventListener('resize', applyTilt))
</script>

<style scoped lang="scss">
.lab {
  min-height: 100dvh;
  padding: var(--space-4) var(--space-5) var(--space-6);
  background: radial-gradient(ellipse at 50% 0%, var(--color-oak-700), var(--bg) 70%);
  color: var(--text);
  font-family: var(--font-body);

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--fs-display-m);
    color: var(--accent);
  }

  &__back {
    color: var(--text-dim);
  }

  &__intro {
    max-width: 60ch;
    margin: var(--space-2) 0 var(--space-4);
    color: var(--text-dim);
  }

  &__stage {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--space-6);
    padding: var(--space-5) var(--space-4);
    border: 1px solid rgba(201, 162, 39, 0.25);
    border-radius: var(--cut);
    background: rgba(24, 14, 8, 0.35);
  }

  &__seat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  &__die {
    --die-size: 170px;

    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 8px;
    }
  }

  // La tuile plate n'a pas de taille propre : on lui donne celle du cube pour
  // que la comparaison soit honnête.
  &__tile {
    width: 170px;
    height: 170px;
  }

  &__caption {
    font-size: var(--fs-body-s);
    color: var(--text-dim);
  }

  &__panel {
    margin-top: var(--space-5);
  }

  &__legend {
    margin-bottom: var(--space-3);
    font-family: var(--font-display);
    font-size: 1.25rem;
    color: var(--accent);
  }

  &__faces {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  &__face {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-btn);
    background: transparent;
    color: var(--text);
    font-family: var(--font-body);
    cursor: pointer;

    &--on {
      background: var(--accent);
      color: var(--on-accent);
    }
  }

  // Barre d'onglets, collée juste sous le plateau pour rester atteignable.
  &__tabs {
    position: sticky;
    top: min(46dvh, 420px);
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    padding: var(--space-2) 0;
    background: var(--bg);
  }

  &__tab {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-btn);
    background: transparent;
    color: var(--text);
    font-family: var(--font-display);
    font-size: 1rem;
    letter-spacing: 0.04em;
    cursor: pointer;

    &--on {
      background: var(--accent);
      color: var(--on-accent);
    }
  }

  &__knobs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3) var(--space-5);
    margin-bottom: var(--space-3);
  }

  &__knob {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--fs-body-s);
    color: var(--text-dim);

    b {
      color: var(--text);
      font-family: var(--font-mono);
    }

    input[type='range'] {
      width: 15rem;
      accent-color: var(--accent);
    }

    &--check {
      flex-direction: row;
      align-items: center;
      gap: var(--space-2);
    }
  }

  &__hint {
    max-width: 60ch;
    font-size: var(--fs-body-s);
    color: var(--text-dim);
  }

  &__code {
    max-width: 60ch;
    margin-top: var(--space-2);
    padding: var(--space-3);
    border: 1px solid rgba(201, 162, 39, 0.3);
    border-radius: var(--cut);
    background: rgba(24, 14, 8, 0.55);
    color: var(--accent-hi);
    font-family: var(--font-mono);
    font-size: var(--fs-body-s);
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre;
    user-select: all;
  }

  // ── Maquette du plateau ──────────────────────────────────────────────────
  // Mêmes proportions et mêmes zones que `pages/game.vue` : régler la
  // perspective sur une approximation ne servirait à rien.
  // Collé en haut : c'est ce qui permet de régler en voyant. Un plateau qui
  // sort de l'écran dès qu'on descend vers ses curseurs ne sert à rien.
  &__board {
    position: sticky;
    top: 0;
    z-index: 2;
    aspect-ratio: 1672 / 941;
    height: min(46dvh, 420px);
    width: auto;
    margin-bottom: var(--space-3);
    // Le contenu défile DERRIÈRE le plateau : sans fond, il transparaîtrait.
    box-shadow: 0 12px 24px -8px var(--bg);
    background-position: center;
    background-size: 100% 100%;
    container-type: size;
  }

  &__board-center {
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

  &__board-cell {
    --die-size: 7cqw;

    width: var(--die-size);
    height: var(--die-size);
  }

  // Rangée mesurée sur l'image : cadres x 413..1242, y 652..748 sur 1672×941.
  &__board-slots {
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

  // Mêmes règles que sur le plateau : la perspective sur le parent, la rotation
  // sur l'enfant — sinon il n'y a pas de profondeur, juste une projection plate.
  &__zone {
    position: absolute;
    perspective: 90cqw;

    > * {
      transform: rotateZ(var(--tilt-z, 0deg)) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
    }

    &--card > * {
      width: 100%;
      height: 100%;
    }
  }

  // La carte projetée sur ses quatre coins : l'origine doit être le coin
  // haut-gauche, la matrice part de là.
  &__quad {
    position: absolute;
    transform-origin: 0 0;

    > * {
      width: 100%;
      height: 100%;
    }
  }

  &__handle {
    position: absolute;
    z-index: 3;
    width: 18px;
    height: 18px;
    translate: -50% -50%;
    padding: 0;
    border: 2px solid var(--bg);
    border-radius: 50%;
    background: var(--accent);
    cursor: grab;
    touch-action: none;

    &--held {
      background: var(--accent-hi);
      cursor: grabbing;
      scale: 1.25;
    }
  }

  &__board-slot {
    --die-size: 4.4cqw;

    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }

  // ── Piste de comparaison ─────────────────────────────────────────────────
  // Le dé roulé arrive de HORS de sa case : la piste lui laisse la place, et
  // ne masque pas ce qui déborde.
  &__track {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-5);
    margin-bottom: var(--space-4);
    padding: var(--space-4);
    border: 1px solid rgba(201, 162, 39, 0.25);
    border-radius: var(--cut);
    background: rgba(24, 14, 8, 0.35);
  }

  &__lane {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    gap: var(--space-3);
  }

  &__runner {
    --die-size: 96px;

    display: grid;
    place-items: center;
    width: 22rem;
    height: 9rem;
  }

  // Taille volontairement proche de celle du plateau : un cube joli en grand
  // peut devenir illisible à 64 px.
  &__volley {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  &__volley-die {
    --die-size: 82px;
  }

  .gamers-list {
    display: flex;
    justify-content: center;
    gap: 12px;
    width: 100%;

    .gamer-wrapper {
      flex: 1 1 0;
      max-width: 220px;
    }
  }
}
</style>
