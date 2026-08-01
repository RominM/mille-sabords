<script setup lang="ts">
import type { Player } from '@ms/engine'
import slotFrame from '~/assets/images/ui/gamer-slot.png'
import botAvatar from '~/assets/images/character/chara_bot.png'
import pirateAvatar from '~/assets/images/character/chara_pirate.png'

const props = defineProps<{
  player: Player | null
  current?: boolean
  seconds?: number
  totalSeconds?: number
}>()

const avatar = computed(() => (props.player?.bot ? botAvatar : pirateAvatar))

const scoreText = computed(() => String(props.player?.score ?? 0))
/** Le score ne doit ni déborder ni être tronqué : on réduit la police si besoin. */
const scoreClass = computed(() => {
  const n = scoreText.value.length
  return n >= 6 ? 'is-xs' : n >= 5 ? 'is-sm' : ''
})
</script>

<template>
  <!-- Rangée de l'échelle : la carte y est centrée, sans déformation -->
  <div class="pslot-row">
    <div v-if="player" class="pslot" :class="{ 'is-waiting': !current, 'is-current': current }">
      <img :src="slotFrame" alt="" class="pslot__frame" />
      <img :src="avatar" alt="" class="pslot__avatar" />
      <span class="pslot__name">{{ player.name }}</span>
      <span class="pslot__score" :class="scoreClass">{{ scoreText }}</span>
      <PlayerTimer
        v-if="current && seconds !== undefined"
        class="pslot__timer"
        :seconds="seconds"
        :total="totalSeconds ?? 60"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
// ── Rangée : centre la carte dans le barreau de l'échelle ───────────────────
.pslot-row {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

// ── Carte joueur ────────────────────────────────────────────────────────────
// Le PNG source (1024×1536) est surtout du vide orange : le cadre utile n'occupe
// que la bande y 34.96 % → 61.59 % (ratio 2.504). On cadre donc cette bande via
// overflow + mise à l'échelle de l'image, plutôt que d'afficher tout le PNG.
.pslot {
  position: relative;
  height: 113%;
  aspect-ratio: 970 / 418; // ratio réel du cadre → jamais déformé
  max-width: 100%;
  overflow: hidden;
  container-type: size; // les enfants se dimensionnent en cqh/cqw
  transition: filter 0.2s ease;
}
// Joueurs en attente : couleur ternie
.pslot.is-waiting {
  filter: grayscale(0.7) brightness(0.55);
}
.pslot.is-current {
  filter: drop-shadow(0 0 1.5cqh rgba(232, 196, 104, 0.5));
}

.pslot__frame {
  position: absolute;
  left: 0;
  top: -131.3%; // 34.96 % × 375.5 %
  width: 100%;
  height: 375.5%; // 100 / 26.63 % → la bande du cadre remplit la carte
  object-fit: fill;
  pointer-events: none;
}

// ── Éléments (positions mesurées sur le cadre) ──────────────────────────────
.pslot__avatar {
  position: absolute;
  left: 8.3%;
  top: 21.3%;
  width: 22.9%;
  aspect-ratio: 1; // cercle parfait
  border-radius: 50%;
  object-fit: cover;
  object-position: center 15%; // cadrage sur le visage
}

.pslot__name {
  position: absolute;
  left: 37.5%;
  top: 29.3%;
  width: 31.5%;
  height: 22.2%;
  padding: 0 2cqh;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 12cqh;
  line-height: 22.2cqh; // = hauteur du champ → centrage vertical
  color: var(--color-parchment, #ede0c8);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
  // Débordement : coupé proprement (une animation de défilement viendra plus tard)
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pslot__score {
  position: absolute;
  left: 71.8%;
  top: 29.3%;
  width: 23.6%;
  height: 22.2%;
  padding: 0 1cqh;
  text-align: center;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 15cqh;
  line-height: 22.2cqh;
  color: var(--color-doubloon, #c9a227);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  overflow: hidden; // sécurité, mais les paliers ci-dessous évitent la troncature
}
.pslot__score.is-sm {
  font-size: 13cqh;
} // 5 caractères (ex. -1000)
.pslot__score.is-xs {
  font-size: 11cqh;
} // 6 caractères

.pslot__timer {
  position: absolute;
  left: 39.5%;
  top: 58.7%;
  width: 58.8%;
  height: 13.7%;
}
</style>
