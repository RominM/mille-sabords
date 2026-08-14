/**
 * Préchargeur d'assets.
 *
 * Il découvre TOUTES les images de `app/assets/images/` (via `import.meta.glob`)
 * mais n'en attend qu'une PART : celle de l'écran d'entrée. Le reste — plateau,
 * cartes, dés, tiroirs — se charge derrière, pendant que le joueur saisit son
 * nom, et l'écran d'embarquement finit de couvrir ce qui traîne. Tout attendre
 * revenait à faire patienter devant 4,4 Mo dont l'accueil n'a que faire.
 *
 * Il attend le DÉCODAGE, et pas seulement le téléchargement : `onload` dit que
 * les octets sont là, pas que l'image est prête à peindre. Sans cela la jauge
 * arrivait à 100 % et l'écran se remplissait ensuite, image par image.
 *
 * Robuste par construction : chaque image a un filet de sécurité (timeout), les
 * polices sont plafonnées, et `ready` est TOUJOURS basculé (finally) — le
 * chargeur ne peut jamais rester bloqué, même si un asset ne se résout pas.
 */
export interface PreloaderOptions {
  /** Durée d'affichage minimale du loader, en ms. */
  minDuration?: number
  /** Filet de sécurité par image (ms) avant de la considérer comme chargée. */
  perAssetTimeout?: number
}

/**
 * Ce que l'écran d'ENTRÉE montre : le décor de l'accueil, sa planche, le titre,
 * la plaque d'action, les portraits, les curseurs et le chargeur lui-même.
 *
 * Se tromper ici ne casse rien — une image oubliée arrive une seconde plus
 * tard, une image en trop rallonge l'attente d'autant. C'est un réglage de
 * confort, pas une règle.
 */
const ENTRY_ASSETS = [
  'app-loader',
  'captain-quartier',
  'panel-menu',
  'main-cta',
  'main-title',
  '/character/',
  '/cursors/'
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useAssetPreloader(opts: PreloaderOptions = {}) {
  const minDuration = opts.minDuration ?? 1200
  const perAssetTimeout = opts.perAssetTimeout ?? 8000
  const loaded = ref(0)
  const total = ref(0)
  const ready = ref(false)

  const progress = computed(() => (total.value === 0 ? 100 : Math.round((loaded.value / total.value) * 100)))

  /**
   * Charge une image ET la décode. `decode()` échoue sur certains navigateurs
   * ou formats : son refus ne doit pas retenir l'écran, on retombe alors sur le
   * simple chargement.
   */
  function loadImage(url: string, count = true): Promise<void> {
    return new Promise(resolve => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        if (count) loaded.value++
        resolve()
      }
      const img = new Image()
      img.onload = () => void img.decode().catch(() => {}).finally(done)
      img.onerror = done
      img.src = url
      setTimeout(done, perAssetTimeout) // ne jamais bloquer sur un asset récalcitrant
    })
  }

  async function preload(): Promise<void> {
    const started = performance.now()
    let rest: string[] = []
    try {
      const modules = import.meta.glob('../../assets/images/**/*.{png,jpg,jpeg,webp,avif,svg}', {
        eager: true,
        query: '?url',
        import: 'default',
      }) as Record<string, string>

      const all = Object.entries(modules).filter(([, url]) => Boolean(url))
      const entry: string[] = []
      for (const [path, url] of all) {
        const normalized = path.replaceAll('\\', '/')
        ;(ENTRY_ASSETS.some(part => normalized.includes(part)) ? entry : rest).push(url)
      }
      total.value = entry.length

      await Promise.all(entry.map(url => loadImage(url)))

      // Polices web (plafonnées : on n'attend pas indéfiniment).
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await Promise.race([document.fonts.ready, sleep(3000)])
      }
    } catch (err) {
      console.error('[preloader] échec du préchargement, on continue :', err)
    } finally {
      const elapsed = performance.now() - started
      if (elapsed < minDuration) await sleep(minDuration - elapsed)
      ready.value = true
      // Le reste part APRÈS avoir rendu la main : le joueur a de quoi lire et
      // saisir son nom pendant que le plateau s'installe en silence.
      void Promise.all(rest.map(url => loadImage(url, false)))
    }
  }

  return { loaded, total, progress, ready, preload }
}
