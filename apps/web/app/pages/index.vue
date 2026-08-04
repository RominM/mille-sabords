<template>
  <main class="home" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <div class="home__layout">
      <!-- Zone 1 : la navigation -->
      <HomeMenu :entries="TABS" :current="activeTab" @select="activeTab = $event as TabId" />

      <!-- Zone 2 : conteneur unique. Chaque contenu décide de sa propre mise en
           page — on ne lui impose pas de sous-découpage fixe. -->
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

  // Hauteur FIXE, et non un `min-height` : la navigation réagit au survol, donc
  // un panneau plus haut que les autres décalerait la mise en page centrée et
  // ferait glisser les boutons sous le curseur. Le contenu défile si besoin
  // plutôt que de pousser les murs.
  &__panel {
    display: grid; // une seule cellule : le contenu s'y place comme il veut
    height: 23rem;
    padding: var(--space-5);
    overflow: auto;
  }
}
</style>
