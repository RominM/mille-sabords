<template>
  <main class="home" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <div class="home__layout">
      <!-- Zone 1 : la navigation -->
      <HomeMenu :entries="TABS" :current="activeTab" @select="activeTab = $event as TabId" />

      <section class="home__panel panel" role="tabpanel">
        <GamePitch
          v-if="activeTab === 'play' || activeTab === 'multi'"
          :title="pitch.title"
          :text="pitch.text"
          @embark="onEmbark(activeTab)"
        />
        <RulesPanel v-else-if="activeTab === 'rules'" />
        <SoundSettings v-else />
      </section>
    </div>

    <SoloSetupModal v-if="showSoloSetup" @close="showSoloSetup = false" />
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

/** Les deux modes partagent la même accroche : titre, description, action. */
const pitch = computed(() =>
  activeTab.value === 'multi'
    ? { title: 'L’Équipage', text: 'Créer votre équipage, que le meilleur gagne !' }
    : { title: 'Contre le Corsaire', text: 'Créer une partie rapide contre le corsaire.' }
)

const router = useRouter()
const showSoloSetup = ref(false)

/**
 * Les deux modes divergent ici : le multi va composer son équipage au lobby,
 * le solo se règle sur place — nom, portrait, niveau de l'IA — puis part
 * directement sur le plateau. Aucun des deux ne saute vers `/game` sans que la
 * table ait été composée.
 */
function onEmbark(mode: TabId): void {
  if (mode === 'multi') router.push('/lobby')
  else showSoloSetup.value = true
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

  &__panel {
    display: grid; // une seule cellule : le contenu s'y place comme il veut
    min-height: 22rem;
    padding: var(--space-5);
  }
}
</style>
