<template>
  <Teleport to="body">
    <div
      class="side"
      :class="{ 'side--open': open }"
      :style="{ '--side-top': `${top}%`, '--side-shift': `${shift}%` }"
    >
      <img :src="panelUrl" alt="" class="side__img" />

      <!-- La languette dépasse seule quand le panneau est rentré : c'est la
           poignée. Elle reste atteignable en pleine partie sans rien masquer. -->
      <button
        v-click-sound
        v-tooltip="hint ?? label"
        class="side__tab"
        type="button"
        :aria-expanded="open"
        :aria-label="open ? `Fermer ${label}` : `Ouvrir ${label}`"
        @click="toggle(id)"
      >
        <component :is="icon" class="side__tab-icon" :size="20" :stroke-width="1.75" />
      </button>

      <div class="side__content" :aria-hidden="!open">
        <h2 class="side__title">{{ title ?? label }}</h2>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Tiroir sur le bord gauche : une planche de bois qui glisse, dont seule la
 * languette dépasse au repos.
 *
 * Extrait du barème le jour où l'historique en a demandé un second. Les
 * planches se SUPERPOSENT, décalées de leur seule languette : c'est ce qui
 * donne l'allure d'onglets de dossier, et ce qui laisse le plateau dégagé. D'où
 * l'ouverture exclusive — deux planches ouvertes au même endroit se
 * masqueraient (cf. `useSidePanels`).
 *
 * `Teleport` vers le body : `.plateau` déclare `container-type: size`, ce qui
 * piégerait un `position: fixed` à l'intérieur.
 */
import type { Component } from 'vue'
import panelUrl from '~/assets/images/ui/panel-bareme.webp'

const props = withDefaults(
  defineProps<{
    /** Identifiant du tiroir, pour l'ouverture exclusive. */
    id: string
    /** Nom lu par les lecteurs d'écran — la languette, elle, ne porte qu'une icône. */
    label: string
    /** Icône Lucide de la languette. */
    icon: Component
    /** Titre du contenu. */
    title?: string
    /** Infobulle au survol de la languette, à défaut le libellé. */
    hint?: string
    /** Centre vertical de la planche, en % de la fenêtre. */
    top?: number
    /**
     * Décalage de la planche, en % de SA PROPRE hauteur.
     *
     * C'est ainsi qu'on empile les languettes, et pas autrement : la languette
     * est DESSINÉE sur la planche, à 41,9 % de sa hauteur. Déplacer le bouton
     * seul le sortirait du bois. Il faut donc bouger la planche entière — et un
     * décalage relatif à sa hauteur tient à toutes les tailles d'écran, ce
     * qu'un décalage en pourcentage de fenêtre ne ferait pas.
     */
    shift?: number
  }>(),
  { title: undefined, hint: undefined, top: 50, shift: 0 }
)

const { isOpen, toggle } = useSidePanels()
const open = computed(() => isOpen(props.id))
</script>

<style scoped lang="scss">
// Mesures du fichier panel-bareme.webp (816x1102) : la planche opaque va de
// 22,21 à 793,1080 (772x1060), dont les 94 derniers pixels de large sont la
// languette. Le corps fait donc 677 px, soit 87,7 % de la planche — c'est de
// cette part qu'on la sort de l'écran.
.side {
  position: fixed;
  left: 0;
  top: var(--side-top, 50%);
  z-index: 60; // au-dessus du plateau, sous les modales (100)
  height: min(52dvh, 640px);
  aspect-ratio: 772 / 1060;
  transform: translate(-87.7%, calc(-50% + var(--side-shift, 0%)));
  transition: transform 0.32s ease;

  &--open {
    transform: translate(0, calc(-50% + var(--side-shift, 0%)));
    // Un tiroir ouvert passe devant celui qui ne l'est pas, sans quoi la
    // planche voisine lui couperait un bord.
    z-index: 61;
  }

  &__img {
    position: absolute;
    inset: 0;
    // Le reset plafonne toute image à 100 % : à neutraliser pour l'agrandir.
    max-width: none;
    // 816/772 et 1102/1060 : le fichier ramené à la planche, puis décalé de la
    // marge transparente pour que l'opaque tombe pile sur la boîte.
    width: 105.7%;
    height: 104%;
    left: -2.85%;
    top: -1.98%;
    pointer-events: none;
  }

  // Calé sur la languette DESSINÉE, mesurée sur le fichier : y 465..589 sur
  // 1102, soit 41,9 % de la planche opaque, sur 11,7 % de haut. Le bouton doit
  // tomber pile dessus — à côté, il ne ressemble plus à rien.
  &__tab {
    position: absolute;
    right: 0;
    top: 41.9%;
    width: 12.3%;
    height: 11.7%;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  // Une icône plutôt qu'un mot : la languette est étroite, et un libellé
  // vertical se lit mal en pleine partie.
  &__tab-icon {
    display: block;
    margin: 0 auto;
    color: var(--accent);
    filter: drop-shadow(0 1px 3px rgba(24, 14, 8, 0.95));
    transition: color 0.15s ease;
  }

  &__tab:hover &__tab-icon {
    color: var(--accent-hi);
  }

  // Bois utile, à l'intérieur du liseré doré.
  &__content {
    position: absolute;
    left: 7%;
    top: 6%;
    width: 73%;
    height: 88%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 0.95rem;
    // Illisible et non cliquable tant que le tiroir est rentré.
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  &--open &__content {
    opacity: 1;
    pointer-events: auto;
  }

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 1.3rem;
  }
}
</style>
