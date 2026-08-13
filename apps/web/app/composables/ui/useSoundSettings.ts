/**
 * Réglages sonores partagés par toute l'application. Deux familles distinctes :
 *
 *   musique   — la piste de fond, une seule à la fois (cf. useBackgroundMusic)
 *   ambiance  — les bruitages : clic, survol, dés, rire de défaite…
 *
 * Volontairement séparé de `useBackgroundMusic` : ce dernier crée son élément
 * `Audio` dans `onMounted`, donc l'appeler depuis un écran de réglages ferait
 * jouer une SECONDE piste par-dessus la première. Ici il n'y a que de l'état, on
 * peut l'appeler de partout ; les consommateurs observent et réagissent.
 */

/** Volumes par défaut, en pourcentage — les `Audio` attendent un 0..1. */
export const MUSIC_VOLUME_DEFAULT = 45
export const SFX_VOLUME_DEFAULT = 50

/** Ramène un pourcentage en 0..1, ou à zéro si la famille est coupée. */
const toGain = (percent: number, on: boolean): number =>
  on ? Math.min(1, Math.max(0, percent / 100)) : 0

export const useSoundSettings = () => {
  const musicEnabled = useState('music-enabled', () => true)
  const musicVolume = useState('music-volume', () => MUSIC_VOLUME_DEFAULT)
  const sfxEnabled = useState('sfx-enabled', () => true)
  const sfxVolume = useState('sfx-volume', () => SFX_VOLUME_DEFAULT)

  /** Volumes réellement appliqués : coupée, une famille tombe à zéro. */
  const musicGain = computed(() => toGain(musicVolume.value, musicEnabled.value))
  const sfxGain = computed(() => toGain(sfxVolume.value, sfxEnabled.value))

  return { musicEnabled, musicVolume, musicGain, sfxEnabled, sfxVolume, sfxGain }
}
