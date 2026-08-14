<template>
  <div
    :class="['gamer-slot', { '--current': current }]"
    :style="{ backgroundImage: `url(${gamerLayout})`, width: size }"
  >
    <div class="gamer-slot__content" :style="{ maxWidth: size }">
      <img class="gamer-slot__content__avatar" :src="avatarUrl" alt="avatar pirate" />
      <p class="gamer-slot__content__name">{{ player?.name }}</p>
      <p class="gamer-slot__content__score">{{ player?.score }}</p>

      <div
        class="gamer-slot__content__gauge"
        :class="{ 'gamer-slot__content__gauge--full': reach >= 100 }"
        role="progressbar"
        :aria-valuenow="Math.round(reach)"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Progression vers ${WINNING_SCORE} points`"
      >
        <span class="gamer-slot__content__gauge-fill" :style="{ '--reach': `${reach}%` }" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WINNING_SCORE, type Player } from '@rf/engine'
import gamerLayout from '~/assets/images/ui/gamer-slot.webp'
import botAvatar from '~/assets/images/character/chara_bot.webp'
import pirateAvatar from '~/assets/images/character/chara_pirate.webp'

const props = defineProps({
  size: { type: String, default: '140px' },
  player: { type: Object as PropType<Player | null>, required: true },
  avatar: { type: String, default: '' },
  current: { type: Boolean, default: false }
})

/**
 * Le repli doit se déclencher sur une chaîne VIDE, pas seulement sur `null` :
 * le Corsaire n'a pas de portrait dans la table, la prop vaut donc `''` — et
 * `??` laissait passer ce vide, qui donnait une image cassée.
 */
const avatarUrl = computed(() => props.avatar || (props.player?.bot ? botAvatar : pirateAvatar))

/**
 * Chemin parcouru vers la fin de partie, en %.
 *
 * Un score peut être NÉGATIF (Bateau Pirate raté) : la jauge se vide alors,
 * elle ne part pas à l'envers. Elle plafonne à 100 — au-delà, c'est le dernier
 * tour qui est déclenché, et la jauge n'a plus rien à annoncer.
 */
const reach = computed(() => Math.min(100, Math.max(0, ((props.player?.score ?? 0) / WINNING_SCORE) * 100)))
</script>

<style scoped lang="scss">
.gamer-slot {
  position: relative;
  aspect-ratio: 14 / 11;
  container-type: inline-size;

  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;

  &__content {
    position: absolute;
    inset: 0;
    &__avatar {
      position: absolute;
      top: 1%;
      left: 50%;

      width: 29%;
      aspect-ratio: 1;

      transform: translateX(-50%);

      border-radius: 50%;
      object-fit: cover;
      overflow: hidden;
    }

    &__name {
      position: absolute;
      top: 57%;
      left: 10%;

      width: 80%;
      margin: 0;

      transform: translateY(-50%);

      color: var(--color-parchment, #ede0c8);
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 7cqw;
      line-height: 1;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);

      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__score {
      position: absolute;
      top: 76%;
      left: 10%;

      width: 80%;
      margin: 0;

      transform: translateY(-50%);

      color: var(--color-doubloon, #c9a227);
      font-family: var(--font-mono);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      font-size: 9cqw;
      line-height: 1;
      text-align: center;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);

      white-space: nowrap;
      overflow: hidden;
    }

    // Où en est ce pirate vers la fin de partie. Sa couleur EST l'information :
    // on doit voir d'un regard qui approche du seuil, sans lire un seul chiffre.
    &__gauge {
      position: absolute;
      top: 86.7%;
      left: 8%;

      width: 84%;
      height: 4.5%;

      border: 1px solid rgba(201, 162, 39, 0.35);
      border-radius: 999px;
      background: rgba(24, 14, 8, 0.6);
      overflow: hidden;

      &--full {
        border-color: var(--danger-edge);
        box-shadow: 0 0 6px rgba(192, 82, 75, 0.8);
      }
    }

    // Le dégradé est peint sur TOUTE la piste, puis découpé à la hauteur du
    // score : la couleur d'un pirate ne dépend donc que de sa place sur la
    // route, jamais de la largeur de sa propre barre.
    &__gauge-fill {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        90deg,
        var(--color-bilge) 0%,
        var(--color-doubloon) 55%,
        var(--danger-edge) 100%
      );
      clip-path: inset(0 calc(100% - var(--reach, 0%)) 0 0);
      transition: clip-path 0.45s ease;
    }
  }

  &:not(.--current) {
    filter: grayscale(75%);
  }

  &.--current {
    filter: drop-shadow(0 0 10px #e8c468bf);
  }
}
</style>
