<template>
  <Modal v-if="step === 'fullscreen'" size="sm" title="Plein écran" @close="next">
    <div class="startup">
      <p class="startup__text">
        🎮 Pour une meilleure expérience, passez en plein écran. <strong>(F11)</strong>
      </p>
      <div class="startup__actions">
        <button v-click-sound class="btn" type="button" @click="goFullscreen">
          Passer en plein écran
        </button>
        <button v-click-sound class="btn btn--ghost" type="button" @click="next">Plus tard</button>
      </div>
    </div>
  </Modal>

  <Modal v-else-if="step === 'about'" size="sm" title="À propos" @close="closeAbout">
    <div class="startup">
      <p class="startup__text">
        Cette application est un projet indépendant, développé à des fins personnelles et sans
        exploitation commerciale.
      </p>
      <p class="startup__text">
        Son objectif est de proposer une expérience de jeu à un usage privé, sans volonté de
        concurrencer une œuvre existante.
      </p>
      <p class="startup__text">
        Toute remarque ou demande relative à son contenu sera étudiée avec attention.
      </p>
      <p class="startup__signoff">Bon jeu !</p>

      <button v-click-sound class="btn startup__btn" type="button" @click="closeAbout">
        Compris
      </button>
    </div>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Les deux messages d'accueil, joués à la suite une fois le préchargement fini.
 *
 * Le conseil de plein écran revient à chaque lancement — il dépend de l'état de
 * la fenêtre, pas d'un accord donné une fois. La note « à propos », elle, se
 * retient : la revoir à chaque partie serait pénible.
 */
const ABOUT_SEEN_KEY = 'rf-about-seen'

type Step = 'fullscreen' | 'about' | 'done'

const step = ref<Step>('fullscreen')

/** Passe au message suivant, en sautant « à propos » s'il a déjà été lu. */
function next(): void {
  const seen = import.meta.client && localStorage.getItem(ABOUT_SEEN_KEY) === '1'
  step.value = seen ? 'done' : 'about'
}

async function goFullscreen(): Promise<void> {
  // Le refus du navigateur (geste jugé insuffisant, permission refusée) ne doit
  // pas bloquer l'accueil : on enchaîne dans tous les cas.
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    /* le joueur reste en fenêtré, F11 lui est rappelé */
  }
  next()
}

function closeAbout(): void {
  if (import.meta.client) localStorage.setItem(ABOUT_SEEN_KEY, '1')
  step.value = 'done'
}
</script>

<style scoped lang="scss">
$ink: #2a1c0e;

.startup {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  color: $ink;
  font-family: var(--font-body);
  text-align: left;

  &__text {
    font-size: 1rem;
    line-height: 1.45;
  }

  &__signoff {
    font-family: var(--font-display);
    font-size: 1.4rem;
    text-align: center;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
  }

  &__btn {
    align-self: center;
  }
}
</style>
