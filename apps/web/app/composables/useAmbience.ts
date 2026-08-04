/**
 * Musique d'ambiance : une piste joue en continu, choisie selon l'écran.
 *
 * Jamais de silence — on enchaîne d'une piste à l'autre avec un court fondu.
 *
 * ⚠️ Les navigateurs interdisent de démarrer un son avant que l'utilisateur ait
 * interagi avec la page (politique d'autoplay). On tente donc la lecture tout de
 * suite, et si elle est refusée on la relance au tout premier clic ou appui
 * clavier — en remontant bien le volume, sinon la piste tourne en silence.
 */
import lobbyMusic from '~/assets/sounds/SoundsCrate-Dark_Waters.mp3'
import gamingMusic from '~/assets/sounds/music-in-game.mp3'

const FADE_MS = 420

/** Piste associée à chaque écran. Toute route inconnue retombe sur le lobby. */
const trackForPath = (path: string): string => (path.startsWith('/game') ? gamingMusic : lobbyMusic)

export const useAmbience = () => {
  const route = useRoute()
  // État partagé avec l'écran de paramètres (cf. useSoundSettings).
  const { musicEnabled: enabled, musicVolume, effectiveVolume } = useSoundSettings()
  /** Vrai tant que le navigateur bloque le son (utile pour un indice à l'écran). */
  const blocked = useState('ambience-blocked', () => false)

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

  /** Lance la lecture ET remonte le volume. Renvoie false si le navigateur refuse. */
  const start = async (): Promise<boolean> => {
    if (!audio) return false
    try {
      await audio.play()
      fadeTo(effectiveVolume.value)
      blocked.value = false
      return true
    } catch {
      return false
    }
  }

  /** Réessaie au premier geste de l'utilisateur, une seule fois. */
  const unlockOnFirstGesture = () => {
    if (unlockBound || !import.meta.client) return
    unlockBound = true
    blocked.value = true
    const retry = () => {
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      unlockBound = false
      void start() // ← remonte bien le volume, contrairement à un simple play()
    }
    window.addEventListener('pointerdown', retry)
    window.addEventListener('keydown', retry)
  }

  const play = async (src: string) => {
    if (!audio) return
    audio.src = src
    audio.volume = 0
    if (!(await start())) unlockOnFirstGesture()
  }

  /** Change de piste avec un fondu, sans jamais couper le son brutalement. */
  const switchTo = (src: string) => {
    if (!audio || !enabled.value) return
    const file = src.split('/').pop() ?? src
    if (audio.src && audio.src.endsWith(file) && !audio.paused) return
    if (audio.paused || audio.volume === 0) return void play(src)
    fadeTo(0, () => void play(src))
  }

  onMounted(() => {
    // Élément attaché au document : plus simple à inspecter et à contrôler.
    audio = new Audio()
    audio.loop = true
    audio.volume = 0
    audio.preload = 'auto'
    audio.dataset.ambience = 'true'
    audio.style.display = 'none'
    document.body.appendChild(audio)
    switchTo(trackForPath(route.path))
  })

  watch(
    () => route.path,
    (path) => switchTo(trackForPath(path))
  )

  // La coupure peut être demandée depuis n'importe où (écran de paramètres) :
  // on réagit au changement d'état, plutôt que de tout faire dans un `toggle`
  // local que seul cet écran-ci pourrait appeler.
  watch(enabled, (on) => {
    if (!audio) return
    if (on) switchTo(trackForPath(route.path))
    else fadeTo(0, () => audio?.pause())
  })

  // Le curseur de volume doit répondre immédiatement : pas de fondu ici, sinon
  // le réglage traîne derrière la main. On n'écrase pas un fondu en cours.
  watch(musicVolume, () => {
    if (!audio || fadeTimer !== null || !enabled.value) return
    audio.volume = effectiveVolume.value
  })

  onBeforeUnmount(() => {
    stopFade()
    audio?.pause()
    audio?.remove()
    audio = null
  })

  return { enabled, blocked }
}
