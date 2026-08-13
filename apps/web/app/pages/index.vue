<template>
  <main class="home" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <div class="home__layout">
      <div class="home__nav">
        <div class="home__logo">
          <img :src="titleUrl" alt="Reckless Fathoms" class="home__logo-img" />
        </div>

        <HomeMenu :entries="TABS" :current="activeTab" @select="activeTab = $event as TabId" />
      </div>

      <section class="home__panel" :style="{ backgroundImage: `url(${panelUrl})` }" role="tabpanel">
        <h1 class="home__panel-title">{{ TABS.find((tab) => tab.id === activeTab)?.title }}</h1>

        <div class="home__panel-content">
          <SoloForm v-if="activeTab === 'play'" />

          <CrewForm
            v-else-if="activeTab === 'multi'"
            :error="room.error.value"
            @embark="enterRoom"
          />

          <RulesPanel v-else-if="activeTab === 'rules'" />
          <AppSettings v-else />
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import backgroundUrl from '~/assets/images/ui/captain-quartier.webp'
import panelUrl from '~/assets/images/ui/panel-menu.webp'
import titleUrl from '~/assets/images/main-title.webp'
import type { Pirate } from '~/composables/net/useRoom'

type TabId = 'play' | 'multi' | 'rules' | 'settings'

/** `label` est l'entrée du menu, `title` la pancarte du panneau qu'elle ouvre. */
const TABS: { id: TabId; label: string; title: string }[] = [
  { id: 'play', label: 'Jouer', title: 'Contre le Corsaire' },
  { id: 'multi', label: 'Multijoueur', title: 'L’Équipage' },
  { id: 'rules', label: 'Règles', title: 'Règles' },
  { id: 'settings', label: 'Paramètres', title: 'Paramètres' }
]

const activeTab = ref<TabId>('play')

const router = useRouter()
const room = useRoom()

/**
 * On n'ouvre le lobby qu'une fois la connexion DEMANDÉE : la salle d'équipage
 * n'a rien à montrer avant, et l'y envoyer d'abord obligeait à y refaire la
 * saisie du pirate.
 */
function enterRoom(pirate: Pirate, code: string, hosting: boolean): void {
  room.connect(pirate, code, hosting)
  router.push('/lobby')
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

  --nav-w: 15rem;
  --layout-w: min(1400px, 94vw);
  --panel-w: calc(var(--layout-w) - var(--nav-w) - var(--space-4));
  --panel-h: calc(var(--panel-w) / 1.734);
  --board-top: calc(var(--panel-h) * 0.254);
  // La bande libre au-dessus de la planche, moins le pas qui sépare le logo
  // des sections : le menu retombe ainsi pile à hauteur du bois.
  --logo-h: calc(var(--board-top) - var(--space-3));

  &__layout {
    display: grid;
    grid-template-columns: var(--nav-w) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
    width: var(--layout-w);
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  &__logo {
    position: relative;
    height: var(--logo-h);
  }

  // L'encre du titre n'occupe qu'une partie du fichier (x 112..1085,
  // y 117..635 sur 1200×800) : on dimensionne et on décale l'image pour que
  // cette encre-là remplisse la bande, alignée à gauche sur les sections.
  // La marge transparente déborde alors sur le menu — d'où `pointer-events`,
  // sans quoi elle volerait le survol de la première entrée.
  &__logo-img {
    position: absolute;
    left: calc(var(--logo-h) * -0.216);
    top: calc(var(--logo-h) * -0.225);
    height: calc(var(--logo-h) * 1.541);
    max-width: none;
    pointer-events: none;
    filter: drop-shadow(0 2px 8px rgba(24, 14, 8, 0.9));
  }

  // Conteneur de dimensionnement : le contenu du panneau se règle en `cq*`,
  // donc sur la planche elle-même et non sur la fenêtre.
  &__panel {
    position: relative;
    aspect-ratio: 1708 / 985;
    container-type: size;
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
  }

  // Le cartouche gravé dans la planche : x 580..1107, y 129..337 sur 1708×985.
  &__panel-title {
    position: absolute;
    left: 34%;
    top: 13.1%;
    width: 30.9%;
    height: 21.1%;
    display: grid;
    place-items: center;
    color: var(--accent);
    font-size: 3cqw;
    line-height: 1;
    text-align: center;
    text-shadow: 0 0.3cqh 0.6cqh rgba(24, 14, 8, 0.85);
  }

  // Pas de défilement ICI : la plaque du bouton d'action déborde
  // VOLONTAIREMENT de sa boîte — c'est ainsi qu'elle est dessinée — et ce
  // débordement décoratif suffisait à faire apparaître une barre. Seul un
  // contenu réellement trop long doit défiler, et il s'en charge lui-même.
  // Le contenu remplit la zone : c'est lui qui décide où il défile — le
  // formulaire garde son bouton en bas, les règles défilent en entier.
  &__panel-content {
    position: absolute;
    left: 6%;
    top: 35%;
    width: 88%;
    height: 57%;
    display: grid;
    // Rangée EXPLICITE : sans elle, une rangée automatique se dimensionnerait
    // sur son contenu, le `height: 100%` de l'enfant deviendrait cyclique, et
    // le formulaire déborderait du panneau au lieu de défiler dedans.
    grid-template-rows: minmax(0, 1fr);
  }
}
</style>
