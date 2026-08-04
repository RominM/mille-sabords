/**
 * Réglages sonores partagés par toute l'application.
 *
 * Volontairement séparé de `useAmbience` : ce dernier crée son élément `Audio`
 * dans `onMounted`, donc l'appeler depuis un écran de paramètres ferait jouer
 * une SECONDE piste par-dessus la première. Ici il n'y a que de l'état, on peut
 * l'appeler de partout ; `useAmbience` observe `musicEnabled` et réagit.
 */
export const useSoundSettings = () => {
  const musicEnabled = useState('ambience-enabled', () => true)

  const toggleMusic = () => {
    musicEnabled.value = !musicEnabled.value
  }

  return { musicEnabled, toggleMusic }
}
