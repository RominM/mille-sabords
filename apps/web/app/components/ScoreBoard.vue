<script setup lang="ts">
import type { Player } from '@ms/engine'

defineProps<{ players: Player[]; currentIndex: number; active: boolean }>()
</script>

<template>
  <div class="scoreboard">
    <div
      v-for="(p, i) in players"
      :key="p.id"
      class="panel pscore"
      :class="{ 'pscore--current': active && i === currentIndex }"
    >
      <span class="pscore__name">
        <span v-if="active && i === currentIndex">▸ </span>{{ p.name }}
        <span v-if="p.bot" class="pscore__badge">IA</span>
      </span>
      <span class="score">{{ p.score }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.scoreboard {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.pscore {
  flex: 1 1 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pscore--current {
  --border: var(--color-doubloon-hi);
}
.pscore__name {
  font-family: var(--font-body);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pscore--current .pscore__name {
  color: var(--accent);
}
.pscore__badge {
  font-family: var(--font-mono);
  font-size: var(--fs-body-s);
  color: var(--text-dim);
}
</style>
