<template>
  <Modal show-cross title="Paramètres" @close="emit('close')">
    <div class="settings">
      <SoundSettings />

      <div class="settings__leave">
        <p class="settings__warning">
          Quitter maintenant abandonne la partie en cours&nbsp;: elle ne pourra pas être reprise.
        </p>
        <button v-click-sound class="btn settings__quit" type="button" @click="emit('quit')">
          Quitter la partie
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
/**
 * Réglages accessibles EN COURS DE PARTIE : le son, et la sortie.
 *
 * Distincte des réglages de l'accueil parce qu'elle porte une décision qu'on ne
 * prend nulle part ailleurs — abandonner. D'où l'avertissement : en multi, la
 * table continue sans le joueur, et rien ne le ramènera à son siège une fois
 * l'onglet quitté.
 *
 * Le composant ne navigue pas lui-même : il DEMANDE, la page décide. C'est elle
 * qui sait s'il faut fermer une connexion avant de partir.
 */
const emit = defineEmits<{ close: []; quit: [] }>()
</script>

<style scoped lang="scss">
$ink: #2a1c0e;

.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  color: $ink;
  font-family: var(--font-body);

  &__leave {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding-top: var(--space-3);
    border-top: 1px solid rgba(42, 28, 14, 0.28);
  }

  &__warning {
    max-width: 40ch;
    font-size: var(--fs-body-s);
    text-align: center;
    opacity: 0.85;
  }

  &__quit {
    background: var(--danger);
    color: var(--on-danger);
    border-color: var(--danger-edge);
  }
}
</style>
