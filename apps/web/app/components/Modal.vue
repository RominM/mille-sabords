<template>
  <Teleport to="body">
    <div class="modal-mask" @click.self="emit('close')">
      <div class="modal-dialog" :class="`modal-dialog--${size}`" role="dialog" aria-modal="true">
        <!-- Le rouleau vit dans son propre cadre : c'est LUI qu'on fait pivoter
             d'un quart de tour pour la variante horizontale, sans toucher au
             contenu, qui doit rester droit. -->
        <div class="modal-dialog__frame">
          <img class="modal-dialog__img" src="./../assets/images/ui/parchemin.webp" alt="" />
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
  // Au-dessus des overlays de fin de tour du plateau, qui montent à 20.
  z-index: 100;
  display: grid;
  place-items: center;
  background-color: rgba(1, 1, 1, 0.55);
  overflow: hidden;
}

// Le fichier parchemin.webp fait 1536x1024, mais le rouleau DESSINÉ n'en occupe
// que la partie opaque : x 367..1181, y 32..984, soit 815x953. Caler le
// conteneur sur le ratio du fichier gaspillait donc près de la moitié de la
// largeur en transparent, et écrasait la zone de texte.
//
// Le conteneur épouse maintenant le rouleau lui-même ; c'est l'IMAGE qui est
// agrandie et décalée pour que sa partie opaque vienne exactement dessus.
.modal-dialog {
  position: relative;
  // Deux bornes : la place disponible à l'écran, et un plafond propre à la
  // taille demandée. La hauteur découle du ratio — d'où le passage par la
  // largeur, y compris pour la contrainte verticale.
  --modal-cap: 720px;
  --modal-vh: 92dvh;
  width: min(92vw, calc(var(--modal-vh) * 815 / 953), var(--modal-cap));
  aspect-ratio: 815 / 953;

  // Contenu court — un récapitulatif de tour : le rouleau n'a pas à occuper
  // tout l'écran, et un texte trop étalé se lit moins bien.
  &--sm {
    --modal-cap: 460px;
    --modal-vh: 68dvh;
    // Le titre suit l'échelle : à 2,5rem il mangerait le tiers du rouleau.
    --modal-title: 1.6rem;
    --modal-cross: 2rem;
  }

  // Cadre du rouleau. Neutre à la verticale ; c'est lui qui pivote en `wide`.
  &__frame {
    position: absolute;
    inset: 0;
  }

  // ── Rouleau couché ────────────────────────────────────────────────────────
  // On ne déforme pas l'image : on la fait PIVOTER. Les enroulements, dessinés
  // en haut et en bas, viennent donc à gauche et à droite — ce qu'on veut d'un
  // parchemin horizontal. Les constantes mesurées du fichier restent valables
  // telles quelles, puisqu'elles s'appliquent au cadre avant sa rotation.
  //
  // `container-type: size` sert à ça : `100cqh` donne la HAUTEUR du dialogue,
  // qui devient la largeur du cadre une fois couché. Sans lui, il n'y a aucun
  // moyen en CSS de rendre une dimension à l'autre.
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

    // Surface d'écriture : la bande plate entre les deux enroulements, qui
    // sont désormais latéraux. Mesures du fichier — zone plate y 168..865 sur
    // un rouleau qui va de 32 à 984 — soit 14,3 % à 87,5 % de sa longueur.
    .modal-dialog__content {
      left: 14.5%;
      top: 6%;
      width: 72.5%;
      height: 88%;
    }
  }

  &__img {
    position: absolute;
    // Le reset applique `max-width: 100%` à toutes les images : sans cette
    // neutralisation, elle plafonnerait la largeur ci-dessous et le rouleau
    // n'occuperait que la moitié du conteneur.
    max-width: none;
    // 1536/815 = 188,4 % : largeur du fichier ramenée à celle du rouleau.
    width: 188.4%;
    // Décalages = position de la partie opaque dans le fichier, en % du fichier.
    left: -45%; // -367/1536 x 188,4
    top: -3.4%; // -32/1024 x 107,4 (hauteur du fichier ramenée au rouleau)
    height: 107.4%;
    // Le débordement transparent ne doit pas intercepter le clic de fermeture.
    pointer-events: none;
  }

  // Surface d'écriture : la partie plate entre les deux rouleaux, exprimée
  // cette fois en % du ROULEAU. Marge volontaire sur les bords, qui sont
  // déchirés et irréguliers.
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

    // Contexte clair : l'or par défaut serait criard sur le parchemin, et sa
    // gouttière sombre y ferait une balafre. On reprend l'encre du texte.
    // Hérité par tout ce qui défile ici, la bande des portraits comprise.
    --scrollbar-track: rgba(42, 28, 14, 0.12);
    --scrollbar-thumb: rgba(42, 28, 14, 0.42);
    --scrollbar-thumb-hover: rgba(42, 28, 14, 0.68);
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

  // Le contenu occupe tout le reste. `min-height: 0` sans quoi un enfant trop
  // haut pousserait le conteneur au lieu de défiler dans sa boîte.
  //
  // `overflow-x: hidden` volontairement : un défilement horizontal ici ferait
  // glisser tout le panneau et couperait les libellés à gauche. C'est aux blocs
  // qui en ont besoin — la bande des portraits — de gérer le leur.
  &__slot {
    flex: 1;
    min-height: 0;
    padding: 0 20px;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
</style>
