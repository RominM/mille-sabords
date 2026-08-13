<template>
  <main class="home" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <div class="home__layout">
      <HomeMenu :entries="TABS" :current="activeTab" @select="activeTab = $event as TabId" />

      <section class="home__panel" :style="{ backgroundImage: `url(${panelUrl})` }" role="tabpanel">
        <img class="home__panel-title" :src="titleUrl" alt="Reckless Fathoms" />

        <div class="home__panel-content">
          <GamePitch
            v-if="activeTab === 'play' || activeTab === 'multi'"
            :title="pitch.title"
            :text="pitch.text"
            @embark="onEmbark(activeTab)"
          />
          <RulesPanel v-else-if="activeTab === 'rules'" />
          <SoundSettings v-else />
        </div>
      </section>
    </div>

    <SoloSetupModal v-if="showSoloSetup" @close="showSoloSetup = false" />

    <RoomEntry
      v-if="showRoomEntry"
      :error="room.error.value"
      @close="showRoomEntry = false"
      @create="(pirate) => enterRoom(pirate)"
      @join="(pirate, code) => enterRoom(pirate, code)"
    />
  </main>
</template>

<script setup lang="ts">
import backgroundUrl from '~/assets/images/ui/captain-quartier.webp'
import panelUrl from '~/assets/images/ui/panel-menu.webp'
import titleUrl from '~/assets/images/main-title.webp'
import type { Pirate } from '~/composables/net/useRoom'

type TabId = 'play' | 'multi' | 'rules' | 'settings'

const TABS: { id: TabId; label: string }[] = [
  { id: 'play', label: 'Jouer' },
  { id: 'multi', label: 'Multijoueur' },
  { id: 'rules', label: 'Règles' },
  { id: 'settings', label: 'Paramètres' }
]

const activeTab = ref<TabId>('play')

/** Les deux modes partagent la même accroche : titre, description, action. */
const pitch = computed(() =>
  activeTab.value === 'multi'
    ? { title: 'L’Équipage', text: 'Créer votre équipage, que le meilleur gagne !' }
    : { title: 'Contre le Corsaire', text: 'Créer une partie rapide contre le corsaire.' }
)

const router = useRouter()
const room = useRoom()
const showSoloSetup = ref(false)
const showRoomEntry = ref(false)

/**
 * Les deux modes se règlent sur place, dans le même parchemin : nom, portrait,
 * puis le niveau de l'IA en solo ou le code de salle en multi. Aucun des deux
 * ne quitte l'accueil avant que la table soit composée.
 */
function onEmbark(mode: TabId): void {
  if (mode === 'multi') showRoomEntry.value = true
  else showSoloSetup.value = true
}

/**
 * On n'ouvre le lobby qu'une fois la connexion DEMANDÉE : la salle d'équipage
 * n'a rien à montrer avant, et l'y envoyer d'abord obligeait à y refaire la
 * saisie du pirate.
 */
function enterRoom(pirate: Pirate, code?: string): void {
  room.connect(pirate, code)
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

  &__layout {
    display: grid;
    grid-template-columns: var(--nav-w) minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
    width: var(--layout-w);
  }

  :deep(.home-menu) {
    margin-top: var(--board-top);
  }

  &__panel {
    position: relative;
    aspect-ratio: 1708 / 985;
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
  }

  &__panel-title {
    position: absolute;
    left: 37.5%;
    top: 10.2%;
    width: 24.8%;
    height: auto;
  }

  // Pas de défilement ICI : la plaque du bouton d'action déborde
  // VOLONTAIREMENT de sa boîte — c'est ainsi qu'elle est dessinée — et ce
  // débordement décoratif suffisait à faire apparaître une barre. Seul un
  // contenu réellement trop long doit défiler, et il s'en charge lui-même.
  &__panel-content {
    position: absolute;
    left: 6%;
    top: 35%;
    width: 88%;
    height: 57%;
    display: grid;
    align-content: start;
  }
}
</style>
