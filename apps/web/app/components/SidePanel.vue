<template>
  <Teleport to="body">
    <div
      class="side"
      :class="{ 'side--open': isOpen }"
      :style="{ '--side-top': `${top}%`, '--tab-top': `${tabTop}%` }"
    >
      <img :src="panelUrl" alt="" class="side__img" />

      <!-- La languette dépasse seule quand le panneau est rentré : c'est la
           poignée. Elle reste atteignable en pleine partie sans rien masquer. -->
      <button
        v-click-sound
        class="side__tab"
        type="button"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? `Fermer ${label}` : `Ouvrir ${label}`"
        @click="isOpen = !isOpen"
      >
        <span class="side__tab-label">{{ label }}</span>
      </button>

      <div class="side__content" :aria-hidden="!isOpen">
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
 * Extrait du barème le jour où l'historique en a demandé un second. Les deux
 * planches vivent l'une SOUS l'autre — d'où `top`, qui les sépare vraiment.
 * Décaler seulement les languettes ne suffisait pas : les planches se
 * recouvraient et la seconde masquait la première.
 *
 * `Teleport` vers le body : `.plateau` déclare `container-type: size`, ce qui
 * piégerait un `position: fixed` à l'intérieur.
 */
import panelUrl from '~/assets/images/ui/panel-bareme.webp'

withDefaults(
  defineProps<{
    /** Texte de la languette, et titre par défaut du panneau. */
    label: string
    /** Titre du contenu, quand il doit être plus long que la languette. */
    title?: string
    /** Centre vertical de la planche, en % de la fenêtre. */
    top?: number
    /** Hauteur de la languette sur la planche, en %. */
    tabTop?: number
  }>(),
  { title: undefined, top: 50, tabTop: 40.5 }
)

const isOpen = ref(false)
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
  // Volontairement plus courte qu'une planche seule : il en tient DEUX dans la
  // hauteur, l'une sous l'autre, sans qu'aucune ne déborde de l'écran.
  height: min(42dvh, 500px);
  aspect-ratio: 772 / 1060;
  transform: translate(-87.7%, -50%);
  transition: transform 0.32s ease;

  &--open {
    transform: translate(0, -50%);
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

  &__tab {
    position: absolute;
    right: 0;
    top: var(--tab-top, 40.5%);
    width: 12.3%;
    height: 14%;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  &__tab-label {
    display: block;
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 0.85rem;
    writing-mode: vertical-rl;
    text-shadow: 0 1px 3px rgba(24, 14, 8, 0.9);
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
