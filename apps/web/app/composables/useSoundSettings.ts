/**
 * Réglages sonores partagés par toute l'application.
 *
 * Volontairement séparé de `useAmbience` : ce dernier crée son élément `Audio`
 * dans `onMounted`, donc l'appeler depuis un écran de paramètres ferait jouer
 * une SECONDE piste par-dessus la première. Ici il n'y a que de l'état, on peut
 * l'appeler de partout ; `useAmbience` observe ces valeurs et réagit.
 */

/** Volume de la musique, en pourcentage — l'`Audio` attend un 0..1. */
export const MUSIC_VOLUME_DEFAULT = 45

export const useSoundSettings = () => {
  const musicEnabled = useState('ambience-enabled', () => true)
  const musicVolume = useState('ambience-volume', () => MUSIC_VOLUME_DEFAULT)

  const toggleMusic = () => {
    musicEnabled.value = !musicEnabled.value
  }

  /** Volume réellement appliqué à la piste : coupée, elle tombe à zéro. */
  const effectiveVolume = computed(() =>
    musicEnabled.value ? Math.min(1, Math.max(0, musicVolume.value / 100)) : 0
  )

  return { musicEnabled, musicVolume, effectiveVolume, toggleMusic }
}
