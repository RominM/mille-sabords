<template>
  <Teleport to="body">
    <div class="modal-mask" @click.self="emit('close')">
      <div class="modal-dialog" role="dialog" aria-modal="true">
        <img class="modal-dialog__img" src="./../assets/images/ui/parchemin.webp" alt="" />
        <div class="modal-dialog__content">
          <header class="modal-dialog__content--header">
            <h2 class="modal-dialog__content--header__title">{{ title }}</h2>
            <button
              v-if="showCross"
              v-click-sound
              class="modal-dialog__content--header__cross"
              type="button"
              aria-label="Fermer"
              @click="emit('close')"
            >
              <img src="./../assets/images/ui/cross-bones.webp" alt="" />
            </button>
          </header>
          <div class="modal-dialog__content__slot">
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

.modal-dialog {
  position: relative;
  display: flex;
  margin: auto;
  width: 90%;
  height: 90%;

  &__img {
    max-width: 100%;
    height: 100%;
    max-height: 90dvh;
    margin: auto;
    object-fit: cover;
  }

  &__content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 430px;
    max-height: 440px;
    padding: 0 25px;
    overflow: hidden;
    z-index: 99;

    &--header {
      &__title {
        width: fit-content;
        margin: auto;
        color: #000;
      }

      &__cross {
        position: absolute;
        top: 0;
        right: 20px;
        width: 40px;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
        z-index: 999;
        transition: 0.3s;

        &:hover {
          transform: scale(1.1);
        }
      }
    }

    &__slot {
      height: 370px;
      overflow: auto;
    }
  }
}
</style>
