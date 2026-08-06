<template>
  <Teleport to="body">
    <div class="modal-mask" @click.self="emit('close')">
      <div class="modal-dialog" role="dialog" aria-modal="true">
        <img class="modal-dialog__img" src="./../assets/images/ui/parchemin.webp" alt="" />
        <div class="modal-dialog__content">
          <header class="modal-dialog__header">
            <h2 class="modal-dialog__title">{{ title }}</h2>
            <button
              v-if="showCross"
              v-click-sound
              class="modal-dialog__cross"
              type="button"
              aria-label="Fermer"
              @click="emit('close')"
            >
              <img src="./../assets/images/ui/cross-bones.webp" alt="" />
            </button>
          </header>
          <div class="modal-dialog__slot">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Modale générique posée sur un parchemin.
 *
 * L'affichage est piloté par le parent (`v-if`) : la modale ne fait que
 * DEMANDER sa fermeture via `close` — croix, clic sur le fond, ou Échap.
 *
 * Le `Teleport` vers le body n'est pas cosmétique. Sur le plateau, `.plateau`
 * déclare `container-type: size`, ce qui en fait le bloc conteneur des éléments
 * `position: fixed` : rendue sur place, la modale serait calée sur le plateau et
 * rognée par son `overflow: hidden`.
 */
const emit = defineEmits<{ close: [] }>()

withDefaults(defineProps<{ showCross?: boolean; title?: string }>(), {
  showCross: false,
  title: ''
})

function closeOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', closeOnEscape))
onBeforeUnmount(() => window.removeEventListener('keydown', closeOnEscape))
</script>

<style scoped lang="scss">
.modal-mask {
  position: fixed;
  inset: 0;
  // Au-dessus des overlays de fin de tour du plateau, qui montent à 20.
  z-index: 100;
  display: grid;
  place-items: center;
  background-color: rgba(1, 1, 1, 0.55);
  overflow: hidden;
}

// Le parchemin est un dessin : on verrouille le ratio du conteneur sur celui du
// fichier (1536x1024). Les zones placées en % ci-dessous tombent alors pile sur
// la partie plate, entre les deux rouleaux.
.modal-dialog {
  position: relative;
  height: min(92dvh, 820px);
  aspect-ratio: 1536 / 1024;
  max-width: 96vw;

  &__img {
    width: 100%;
    height: 100%;
    // Le conteneur a exactement le ratio du fichier : rien n'est rogné.
    object-fit: contain;
  }

  // Surface d'écriture mesurée dans parchemin.webp : la partie plate va de 26 %
  // à 75 % en largeur et de 16,4 % à 84,5 % en hauteur — au-delà, les rouleaux
  // s'enroulent et le texte deviendrait illisible.
  &__content {
    position: absolute;
    left: 26%;
    top: 16.4%;
    width: 49%;
    height: 68.1%;
    z-index: 99;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  // Le titre appartient à la mise en page, il ne défile pas avec le contenu.
  &__header {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    // La réserve latérale empêche le titre de passer sous la croix, quelle que
    // soit sa longueur.
    padding: 0 3.5rem;
    color: #2a1c0e;
    font-size: var(--fs-display-l);
    line-height: 1.1;
    text-align: center;
  }

  &__cross {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    width: 2.75rem;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-50%) scale(1.1);
    }

    img {
      width: 100%;
      display: block;
    }
  }

  // Le contenu occupe tout le reste. `min-height: 0` sans quoi un enfant trop
  // haut pousserait le conteneur au lieu de défiler dans sa boîte.
  &__slot {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
}
</style>
