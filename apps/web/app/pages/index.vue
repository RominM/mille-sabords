<template>
  <main class="home" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <div class="home__layout">
      <!-- Zone 1 : la navigation. Un seul onglet actif à la fois. -->
      <nav class="home-nav" role="tablist" aria-label="Menu principal">
        <!--
          Le survol suffit à changer de vue. `v-hover-sound` et non
          `v-click-sound` : les deux sur le même bouton feraient sonner deux fois.
          `focus` garde la navigation au clavier fonctionnelle, `click` sert aux
          écrans tactiles, où le survol n'existe pas.
        -->
        <button
          v-for="tab in TABS"
          :key="tab.id"
          v-hover-sound
          class="home-nav__item"
          :class="{ 'home-nav__item--active': tab.id === activeTab }"
          type="button"
          role="tab"
          :aria-selected="tab.id === activeTab"
          @mouseenter="activeTab = tab.id"
          @focus="activeTab = tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- Zone 2 : conteneur unique. Chaque contenu décide de sa propre mise en
           page — on ne lui impose pas de sous-découpage fixe. -->
      <section class="home-panel panel" role="tabpanel">
        <!-- Jouer / Multijoueur : même forme, centrée -->
        <div v-if="activeTab === 'play' || activeTab === 'multi'" class="pitch">
          <h2 class="pitch__title">{{ pitch.title }}</h2>
          <p class="pitch__text">{{ pitch.text }}</p>
          <button v-click-sound class="btn" type="button" @click="onEmbark(activeTab)">Embarquer</button>
        </div>

        <!-- Règles : liste qui bascule en deux colonnes quand elle s'allonge -->
        <div v-else-if="activeTab === 'rules'" class="sheet">
          <h2 class="sheet__title">Règles</h2>
          <ul class="sheet__list" :class="{ 'sheet__list--dual': rules.length > 5 }">
            <li v-for="rule in rules" :key="rule" class="sheet__item">{{ rule }}</li>
          </ul>
        </div>

        <!-- Paramètres : les contrôles se répartissent librement -->
        <div v-else class="sheet">
          <h2 class="sheet__title">Paramètres</h2>
          <div class="settings">
            <fieldset v-for="group in soundGroups" :key="group.id" class="settings__group">
              <legend class="settings__legend">{{ group.title }}</legend>
              <p class="settings__hint">{{ group.hint }}</p>

              <div class="settings__row">
                <input
                  :id="`setting-${group.id}-on`"
                  v-model="group.enabled.value"
                  class="settings__check"
                  type="checkbox"
                />
                <label class="settings__label" :for="`setting-${group.id}-on`">Activé</label>

                <input
                  :id="`setting-${group.id}-vol`"
                  v-model.number="group.volume.value"
                  class="settings__range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="!group.enabled.value"
                  :aria-label="`Volume — ${group.title}`"
                />
                <output class="settings__value">{{ group.volume.value }} %</output>
              </div>
            </fieldset>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import backgroundUrl from '~/assets/images/ui/captain-quartier.webp'

type TabId = 'play' | 'multi' | 'rules' | 'settings'

const TABS: { id: TabId; label: string }[] = [
  { id: 'play', label: 'Jouer' },
  { id: 'multi', label: 'Multijoueur' },
  { id: 'rules', label: 'Règles' },
  { id: 'settings', label: 'Paramètres' }
]

const activeTab = ref<TabId>('play')

const { rules } = useRules()
const { musicEnabled, musicVolume, sfxEnabled, sfxVolume } = useSoundSettings()

/**
 * Les deux familles de son se règlent à l'identique : on décrit les refs plutôt
 * que de dupliquer le bloc de contrôles. `markRaw` n'est pas nécessaire, mais
 * les refs sont passées telles quelles — d'où les `.value` dans le template.
 */
const soundGroups = [
  {
    id: 'music',
    title: 'Musique',
    hint: 'Les musiques de fond, selon l’écran.',
    enabled: musicEnabled,
    volume: musicVolume
  },
  {
    id: 'sfx',
    title: 'Ambiance',
    hint: 'Les bruitages : clic, survol, dés, rire de défaite…',
    enabled: sfxEnabled,
    volume: sfxVolume
  }
]

/** Les deux modes partagent la même forme de panneau : titre, accroche, action. */
const pitch = computed(() =>
  activeTab.value === 'multi'
    ? { title: 'L’Équipage', text: 'Créer votre équipage, que le meilleur gagne !' }
    : { title: 'Contre le Corsaire', text: 'Créer une partie rapide contre le corsaire.' }
)

/**
 * Point de branchement de la navigation à venir : « Embarquer » mènera au choix
 * de difficulté (solo) ou au formulaire d'équipage (multi). Volontairement non
 * branché sur le routeur tant que ces écrans n'existent pas — les envoyer
 * directement sur `/game` sauterait une étape du parcours.
 */
function onEmbark(mode: TabId): void {
  // TODO(navigation) : router.push() une fois les écrans intermédiaires créés.
  console.info(`[accueil] Embarquer — mode « ${mode} » (navigation à brancher)`)
}
</script>

<style scoped lang="scss">
.home {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: var(--space-4);
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;

  // Deux zones côte à côte : la colonne de navigation garde sa largeur, le
  // panneau prend tout le reste.
  &__layout {
    display: grid;
    grid-template-columns: minmax(11rem, auto) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: stretch;
    width: min(900px, 100%);
  }
}

// ── Zone 1 : navigation ─────────────────────────────────────────────────────
.home-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__item {
    padding: var(--space-3) var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-btn);
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-display);
    font-size: var(--fs-display-m);
    line-height: 1.1;
    text-align: left;
    cursor: pointer;
    transition:
      color 0.15s ease,
      border-color 0.15s ease;

    &:hover {
      color: var(--text);
    }

    // L'or ne signale QUE l'actionnable ou le gagné : ici, l'onglet courant.
    &--active {
      color: var(--accent);
      border-color: var(--accent);
      background: rgba(201, 162, 39, 0.08);
    }
  }
}

// ── Zone 2 : conteneur unique ───────────────────────────────────────────────
.home-panel {
  display: grid; // une seule cellule : le contenu s'y place comme il veut
  min-height: 22rem;
  padding: var(--space-5);
}

// Jouer / Multijoueur : bloc centré dans les deux axes
.pitch {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  text-align: center;

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: var(--fs-display-l);
  }

  &__text {
    max-width: 34ch;
    color: var(--text-dim);
    font-family: var(--font-body);
  }
}

// Règles / Paramètres : titre en haut, contenu dessous
.sheet {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-content: start;

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: var(--fs-display-m);
  }

  &__list {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
  }

  // Deux colonnes seulement si la liste est longue — et une seule dès que le
  // conteneur devient trop étroit pour les tenir.
  //
  // La largeur de colonne est le seuil de bascule : le navigateur ne passe à
  // deux colonnes que si `2 × largeur + gouttière` tient dans le conteneur.
  // 14rem plutôt que 18rem, sinon le panneau (~596px utiles) reste sur une
  // seule colonne alors qu'il a la place pour deux.
  &__list--dual {
    columns: 14rem 2;
    column-gap: var(--space-4);
  }

  &__item {
    margin-bottom: var(--space-2);
    break-inside: avoid; // une règle ne doit pas être coupée entre deux colonnes
  }
}

// ── Contrôles de réglage ────────────────────────────────────────────────────
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    border: 0; // le fieldset n'est là que pour grouper sémantiquement
  }

  &__legend {
    padding: 0;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: var(--fs-body-l);
  }

  &__hint {
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
  }

  &__row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  &__label {
    color: var(--text);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
    cursor: pointer;
  }

  &__value {
    min-width: 3.5rem;
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: var(--fs-body-s);
    text-align: right;
  }

  &__check {
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--accent);
    cursor: pointer;
  }

  // Piste en Chêne Vieilli, curseur en Doublon. `appearance: none` impose de
  // redessiner piste et curseur pour chaque moteur — d'où les deux familles de
  // sélecteurs, qui ne peuvent pas être regroupées (un sélecteur inconnu
  // invaliderait toute la règle).
  &__range {
    flex: 1;
    height: 1.25rem;
    appearance: none;
    background: transparent;
    cursor: pointer;

    &::-webkit-slider-runnable-track {
      height: 0.4rem;
      border-radius: 999px;
      background: var(--color-oak);
    }

    &::-moz-range-track {
      height: 0.4rem;
      border-radius: 999px;
      background: var(--color-oak);
    }

    &::-webkit-slider-thumb {
      appearance: none;
      width: 1rem;
      height: 1rem;
      // Recentre le curseur sur une piste de 0.4rem.
      margin-top: -0.3rem;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: var(--shadow-1);
    }

    &::-moz-range-thumb {
      width: 1rem;
      height: 1rem;
      border: 0;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: var(--shadow-1);
    }

    &:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 4px;
    }

    // Famille coupée : le curseur reste lisible mais visiblement inopérant.
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
</style>
