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
