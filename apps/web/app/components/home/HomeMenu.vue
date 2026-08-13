<template>
  <nav class="home-menu" role="tablist" aria-label="Menu principal">
    <button
      v-for="entry in entries"
      :key="entry.id"
      v-hover-sound
      class="home-menu__item"
      :class="{ 'home-menu__item--active': entry.id === current }"
      type="button"
      role="tab"
      :aria-selected="entry.id === current"
      @mouseenter="select(entry.id)"
      @focus="select(entry.id)"
      @click="select(entry.id)"
    >
      {{ entry.label }}
    </button>
  </nav>
</template>

<script setup lang="ts">
/**
 * Navigation de l'accueil. Elle ne connaît pas les écrans qu'elle commande :
 * elle reçoit les entrées et signale celle qui est visée.
 */
defineProps<{
  entries: { id: string; label: string }[]
  current: string
}>()

const emit = defineEmits<{ select: [id: string] }>()

function select(id: string): void {
  emit('select', id)
}
</script>

<style scoped lang="scss">
.home-menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  &__item {
    padding: var(--space-3) var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-btn);
    background: transparent;
    color: var(--text-dim);
    font-family: var(--font-display);
    font-size: 2.4rem;
    line-height: 1.1;
    text-shadow: 0 2px 6px rgba(24, 14, 8, 0.9);
    text-align: left;
    transition:
      color 0.15s ease,
      border-color 0.15s ease;

    &:hover {
      color: var(--text);
    }

    &--active {
      color: var(--accent);
      border-color: var(--accent);
      background: rgba(201, 162, 39, 0.08);
    }
  }
}
</style>
