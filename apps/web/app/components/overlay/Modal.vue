<template>
  <Teleport to="body">
    <div class="modal-mask" @click.self="emit('close')">
      <div class="modal-dialog" :class="`modal-dialog--${size}`" role="dialog" aria-modal="true">
        <div class="modal-dialog__frame">
          <img class="modal-dialog__img" src="~/assets/images/ui/parchemin.webp" alt="" />
        </div>
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
              <img src="~/assets/images/ui/cross-bones.webp" alt="" />
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
 * Le `Teleport` vers le body n'est pas cosmétique. Sur le plateau, `.game__board`
 * déclare `container-type: size`, ce qui en fait le bloc conteneur des éléments
 * `position: fixed` : rendue sur place, la modale serait calée sur le plateau et
 * rognée par son `overflow: hidden`.
 */
const emit = defineEmits<{ close: [] }>()

withDefaults(
  defineProps<{
    showCross?: boolean
    title?: string
    /**
     * Encombrement du rouleau. `sm` pour un contenu court — un récapitulatif de
     * fin de tour n'a pas à occuper tout l'écran.
     */
    /**
     * `wide` couche le rouleau : les enroulements passent à gauche et à droite,
     * et la surface d'écriture devient une bande horizontale. Beaucoup plus de
     * place pour un formulaire, qui n'a alors plus à défiler.
     */
    size?: 'sm' | 'md' | 'wide'
  }>(),
  { showCross: false, title: '', size: 'md' }
)

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
  z-index: 100;
  display: grid;
  place-items: center;
  background-color: rgba(1, 1, 1, 0.55);
  overflow: hidden;
}

.modal-dialog {
  position: relative;
  --modal-cap: 720px;
  --modal-vh: 92dvh;
  width: min(92vw, calc(var(--modal-vh) * 815 / 953), var(--modal-cap));
  aspect-ratio: 815 / 953;

  &--sm {
    --modal-cap: 460px;
    --modal-vh: 68dvh;
    --modal-title: 1.6rem;
    --modal-cross: 2rem;
  }

  &__frame {
    position: absolute;
    inset: 0;
  }

  &--wide {
    --modal-cap: 1120px;
    --modal-vh: 86dvh;

    container-type: size;
    width: min(94vw, calc(var(--modal-vh) * 953 / 815), var(--modal-cap));
    aspect-ratio: 953 / 815;

    .modal-dialog__frame {
      inset: auto;
      left: 50%;
      top: 50%;
      width: 100cqh;
      height: 100cqw;
      translate: -50% -50%;
      rotate: 90deg;
    }

    .modal-dialog__content {
      left: 14.5%;
      top: 6%;
      width: 72.5%;
      height: 88%;
    }
  }

  &__img {
    position: absolute;
    max-width: none;
    width: 188.4%;
    left: -45%; // -367/1536 x 188,4
    top: -3.4%; // -32/1024 x 107,4 (hauteur du fichier ramenée au rouleau)
    height: 107.4%;
    pointer-events: none;
  }

  &__content {
    position: absolute;
    left: 8%;
    top: 15%;
    width: 84%;
    height: 72%;
    z-index: 99;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    --scrollbar-track: rgba(42, 28, 14, 0.12);
    --scrollbar-thumb: rgba(42, 28, 14, 0.42);
    --scrollbar-thumb-hover: rgba(42, 28, 14, 0.68);
  }

  &__header {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    padding: 0 3.5rem;
    color: #2a1c0e;
    font-size: var(--modal-title, var(--fs-display-l));
    line-height: 1.1;
    text-align: center;
  }

  &__cross {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    width: var(--modal-cross, 2.75rem);
    padding: 0;
    border: 0;
    background: none;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-50%) scale(1.1);
    }

    img {
      width: 100%;
      display: block;
    }
  }

  &__slot {
    flex: 1;
    min-height: 0;
    padding: 0 20px;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
</style>
