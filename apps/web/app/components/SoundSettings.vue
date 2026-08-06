<template>
  <div class="sound-settings">
    <h2 class="sound-settings__title">Paramètres</h2>

    <SoundSettingGroup
      id="setting-music"
      v-model:enabled="musicEnabled"
      v-model:volume="musicVolume"
      title="Musique"
      hint="Les musiques de fond, selon l’écran."
    />

    <SoundSettingGroup
      id="setting-sfx"
      v-model:enabled="sfxEnabled"
      v-model:volume="sfxVolume"
      title="Ambiance"
      hint="Les bruitages : clic, survol, dés, rire de défaite…"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Panneau des réglages sonores : il fait le lien entre l'état partagé et les
 * contrôles, sans savoir comment ceux-ci sont dessinés.
 */
const { musicEnabled, musicVolume, sfxEnabled, sfxVolume } = useSoundSettings()
</script>

<style scoped lang="scss">
.sound-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-content: start;

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 2.6rem;
  }
}
</style>
