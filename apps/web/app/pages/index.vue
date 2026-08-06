<template>
  <main class="home" :style="{ backgroundImage: `url(${backgroundUrl})` }">
    <div class="home__layout">
      <!-- Zone 1 : la navigation -->
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
  </main>
</template>

<script setup lang="ts">
import backgroundUrl from '~/assets/images/ui/captain-quartier.webp'
import panelUrl from '~/assets/images/ui/panel-menu.webp'
import titleUrl from '~/assets/images/main-title.webp'

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
  // Largeur de la planche, connue à l'avance : c'est ce qui reste une fois la
  // colonne de navigation et la gouttière retirées. On en déduit sa hauteur par
  // son ratio, et donc où se trouve le bois dans la page — indispensable pour
  // aligner la navigation sur la planche et non sur l'image (dont le quart
  // supérieur n'est que le cartouche, en grande partie transparent).
  --nav-w: 15rem;
  --layout-w: min(1400px, 94vw);
  --panel-w: calc(var(--layout-w) - var(--nav-w) - var(--space-4));
  --panel-h: calc(var(--panel-w) / 1.734);
  // La planche commence à 21,8 % de la hauteur de l'image, son bois utile à 25,4 %.
  --board-top: calc(var(--panel-h) * 0.254);

  &__layout {
    display: grid;
    grid-template-columns: var(--nav-w) minmax(0, 1fr);
    gap: var(--space-4);
    // `start` et non `stretch` : la hauteur du panneau doit venir de son ratio,
    // pas de la rangée de grille, sinon la planche se déforme.
    align-items: start;
    width: var(--layout-w);
  }

  // Décalée pour démarrer avec le bois, pas avec le bord de l'image.
  :deep(.home-menu) {
    margin-top: var(--board-top);
  }

  // La planche est un dessin : on verrouille son ratio et on l'étire à 100%
  // dans les deux axes. C'est ce qui rend fiables les positions en % ci-dessous
  // — elles tombent alors pile sur le cartouche et sur le bois.
  &__panel {
    position: relative;
    aspect-ratio: 1708 / 985;
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
  }

  // Cartouche mesuré dans panel-menu.webp : ouverture x 580..1107, y 129..337.
  //
  // Le fichier du titre porte une large marge transparente (encre 974x519 dans
  // 1200x800) : on le dimensionne donc sur son ENCRE et non sur le fichier,
  // sinon il n'occuperait que la moitié de la place disponible. La largeur et
  // les décalages ci-dessous recentrent l'encre sur le creux du cartouche.
  &__panel-title {
    position: absolute;
    left: 37%;
    top: 10.2%;
    width: 24.8%;
    height: auto;
  }

  // Zone utile : sous le cartouche (son ornement descend jusqu'à y=377) et à
  // l'intérieur du cadre doré (bois de x 78..1637, jusqu'à y=915).
  // `overflow: auto` pour qu'un contenu long défile au lieu de déborder du bois.
  &__panel-content {
    position: absolute;
    left: 6%;
    top: 39%;
    width: 88%;
    height: 53.5%;
    display: grid; // une seule cellule : le contenu s'y place comme il veut
    overflow: auto;
  }
}
</style>
