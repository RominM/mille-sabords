/**
 * Musique d'ambiance : une piste joue en continu, choisie selon l'écran.
 *
 * Jamais de silence — on enchaîne d'une piste à l'autre avec un court fondu, et
 * la lecture reprend d'elle-même si le navigateur a bloqué le démarrage
 * automatique (politique d'autoplay : il faut une première interaction).
 */
import lobbyMusic from '~/assets/sounds/SoundsCrate-Dark_Waters.mp3'
import gamingMusic from '~/assets/sounds/music-in-game.mp3'

const VOLUME = 0.45
const FADE_MS = 420

/** Piste associée à chaque écran. Toute route inconnue retombe sur le lobby. */
const trackForPath = (path: string): string => (path.startsWith('/solo') ? gamingMusic : lobbyMusic)

export const useAmbience = () => {
  const route = useRoute()
  const enabled = useState('ambience-enabled', () => true)

  let audio: HTMLAudioElement | null = null
  let fadeTimer: ReturnType<typeof setInterval> | null = null
  let unlockBound = false

  const stopFade = () => {
    if (fadeTimer !== null) {
      clearInterval(fadeTimer)
      fadeTimer = null
    }
  }

  /** Fait glisser le volume vers `target`, puis exécute `done`. */
  const fadeTo = (target: number, done?: () => void) => {
    if (!audio) return
    stopFade()
    const step = (target - audio.volume) / Math.max(1, Math.round(FADE_MS / 40))
    fadeTimer = setInterval(() => {
      if (!audio) return stopFade()
      const next = audio.volume + step
      const arrived = step >= 0 ? next >= target : next <= target
      audio.volume = Math.min(1, Math.max(0, arrived ? target : next))
      if (arrived) {
        stopFade()
        done?.()
      }
    }, 40)
  }

  /**
   * Le navigateur refuse le son tant que l'utilisateur n'a pas interagi :
   * on réessaie alors au premier clic ou à la première touche.
   */
  const unlockOnFirstGesture = () => {
    if (unlockBound || !import.meta.client) return
    unlockBound = true
    const retry = () => {
      audio?.play().catch(() => {})
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      unlockBound = false
    }
    window.addEventListener('pointerdown', retry, { once: true })
    window.addEventListener('keydown', retry, { once: true })
  }

  const play = (src: string) => {
    if (!audio) return
    audio.src = src
    audio.volume = 0
    audio.play().then(() => fadeTo(VOLUME)).catch(unlockOnFirstGesture)
  }

  /** Change de piste avec un fondu, sans jamais couper le son brutalement. */
  const switchTo = (src: string) => {
    if (!audio || !enabled.value) return
    const current = audio.src
    // `audio.src` est absolu : on compare sur la fin du chemin
    if (current && current.endsWith(src.split('/').pop() ?? src)) return
    if (audio.paused || audio.volume === 0) return play(src)
    fadeTo(0, () => play(src))
  }

  onMounted(() => {
    audio = new Audio()
    audio.loop = true
    audio.volume = 0
    audio.preload = 'auto'
    switchTo(trackForPath(route.path))
  })

  watch(
    () => route.path,
    path => switchTo(trackForPath(path))
  )

  onBeforeUnmount(() => {
    stopFade()
    audio?.pause()
    audio = null
  })

  /** Coupe ou remet la musique (pour un futur bouton mute). */
  const toggle = () => {
    enabled.value = !enabled.value
    if (!audio) return
    if (enabled.value) switchTo(trackForPath(route.path))
    else fadeTo(0, () => audio?.pause())
  }

  return { enabled, toggle }
}
