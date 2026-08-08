<template>
  <div class="lab">
    <header class="lab__head">
      <h1 class="lab__title">Labo — animation des dés</h1>
      <NuxtLink to="/" class="lab__back">← accueil</NuxtLink>
    </header>

    <p class="lab__intro">
      Prototype isolé : le cube 3D CSS tombe sur une face <strong>imposée</strong>, comme le
      fera le vrai jeu où le moteur (ou le serveur) a déjà tiré le résultat.
      Cliquer le dé le relance.
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
        <button v-click-sound type="button" class="lab__face" @click="rollSingle()">
          au hasard
        </button>
      </div>
    </section>

    <section class="lab__panel">
      <h2 class="lab__legend">Réglages</h2>
      <div class="lab__knobs">
        <label class="lab__knob">
          <span>Durée du vol <b>{{ duration }} ms</b></span>
          <input v-model.number="duration" type="range" min="400" max="2400" step="50" />
        </label>
        <label class="lab__knob">
          <span>Tours minimum <b>{{ turns }}</b></span>
          <input v-model.number="turns" type="range" min="1" max="5" step="1" />
        </label>
        <label class="lab__knob">
          <span>Inclinaison au repos — X <b>{{ tiltX }}°</b></span>
          <input v-model.number="tiltX" type="range" min="-35" max="35" step="1" />
        </label>
        <label class="lab__knob">
          <span>Inclinaison au repos — Y <b>{{ tiltY }}°</b></span>
          <input v-model.number="tiltY" type="range" min="-35" max="35" step="1" />
        </label>
        <label class="lab__knob">
          <span>Échelle de la tuile <b>{{ artScale.toFixed(2) }}×</b></span>
          <input v-model.number="artScale" type="range" min="1" max="1.8" step="0.01" />
        </label>
        <label class="lab__knob lab__knob--check">
          <input v-model="sound" type="checkbox" />
          <span>Bruitage</span>
        </label>
      </div>
      <p class="lab__hint">
        Inclinaison à 0/0 : la face demandée est bien à plat, très lisible, mais le dé
        redevient un carré. Autour de −14/−18, il reste un objet en volume.
      </p>
    </section>

    <!-- Réglage de la perspective, SUR le vrai décor : c'est le seul endroit où
         l'on peut juger si un dé est posé sur la table ou flotte au-dessus. -->
    <section class="lab__panel">
      <h2 class="lab__legend">Perspective du plateau</h2>
      <div ref="boardEl" class="lab__board" :style="{ backgroundImage: `url(${layoutUrl})` }">
        <div class="lab__board-center">
          <div v-for="(die, i) in board" :key="i" class="lab__board-cell">
            <DieCube :face="die.face" :roll="die.roll" :duration="duration" :silent="i > 0" />
          </div>
        </div>
        <div class="lab__board-slots">
          <div v-for="i in 8" :key="i" class="lab__board-slot">
            <DieCube :face="slots[i - 1]!.face" :roll="0" seated />
          </div>
        </div>
      </div>

      <div class="lab__knobs">
        <label class="lab__knob">
          <span>Convergence au bord (yaw) <b>{{ perspective.yaw }}°</b></span>
          <input v-model.number="perspective.yaw" type="range" min="0" max="30" step="0.5" />
        </label>
        <label class="lab__knob">
          <span>Plongée en HAUT du plateau <b>{{ perspective.pitchTop }}°</b></span>
          <input v-model.number="perspective.pitchTop" type="range" min="0" max="25" step="0.5" />
        </label>
        <label class="lab__knob">
          <span>Plongée en BAS du plateau <b>{{ perspective.pitchBottom }}°</b></span>
          <input v-model.number="perspective.pitchBottom" type="range" min="0" max="25" step="0.5" />
        </label>
      </div>
      <PlateButton @click="rollBoard">Lancer sur le plateau</PlateButton>
      <p class="lab__hint">
        Quand ça te va, donne-moi ces trois nombres : ils vont dans
        <code>BOARD_PERSPECTIVE</code> (<code>app/utils/boardTilt.ts</code>), et le
        plateau les reprend tels quels. Réglage courant du jeu :
        {{ BOARD_PERSPECTIVE.yaw }} / {{ BOARD_PERSPECTIVE.pitchTop }} /
        {{ BOARD_PERSPECTIVE.pitchBottom }}.
      </p>
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
          :duration="duration"
          :turns="turns"
          :delay="i * stagger"
          :tilt-x="tiltX"
          :tilt-y="tiltY"
          :art-scale="artScale"
          :silent="!sound || i > 0"
        />
      </div>
      <div class="lab__knobs">
        <label class="lab__knob">
          <span>Décalage entre dés <b>{{ stagger }} ms</b></span>
          <input v-model.number="stagger" type="range" min="0" max="220" step="10" />
        </label>
      </div>
      <PlateButton @click="rollVolley">Lancer les 8</PlateButton>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * Page bac à sable, hors du jeu : elle sert à trancher une question de
 * direction artistique — le cube 3D remplace-t-il la tuile plate ? — avant de
 * toucher au plateau. Rien ici ne doit être réutilisé tel quel.
 */
import { FACES, type DieFace } from '@rf/engine'
import layoutUrl from '~/assets/images/ui/layout-game.webp'

const FACE_LABEL: Record<DieFace, string> = {
  sabre: 'sabre',
  skull: 'tête de mort',
  monkey: 'singe',
  parrot: 'perroquet',
  coin: 'pièce',
  diamond: 'diamant',
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

const volley = reactive(
  Array.from({ length: 8 }, () => ({ face: draw(), roll: 0 }))
)

function rollVolley(): void {
  for (const die of volley) {
    die.face = draw()
    die.roll += 1
  }
}

// ── Perspective sur le vrai décor ────────────────────────────────────────────
/** Copie modifiable du réglage du jeu : on tourne les boutons sans rien casser. */
const perspective = reactive({ ...BOARD_PERSPECTIVE })

const board = reactive(Array.from({ length: 8 }, () => ({ face: draw(), roll: 0 })))
const slots = reactive(Array.from({ length: 8 }, () => ({ face: draw() })))

function rollBoard(): void {
  for (const die of board) {
    die.face = draw()
    die.roll += 1
  }
}

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
      perspective
    )
  })
  cells.forEach((cell, i) => {
    cell.style.setProperty('--die-tilt-x', `${tilts[i]!.x}deg`)
    cell.style.setProperty('--die-tilt-y', `${tilts[i]!.y}deg`)
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

  // ── Maquette du plateau ──────────────────────────────────────────────────
  // Mêmes proportions et mêmes zones que `pages/game.vue` : régler la
  // perspective sur une approximation ne servirait à rien.
  &__board {
    position: relative;
    aspect-ratio: 1672 / 941;
    width: min(100%, 60rem);
    margin-bottom: var(--space-4);
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

  &__board-slot {
    --die-size: 4.4cqw;

    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
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
}
</style>
