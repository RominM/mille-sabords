/**
 * Préchargeur d'assets. Découvre TOUTES les images de `app/assets/images/`
 * (via import.meta.glob) et attend leur chargement complet + les polices, avant
 * de libérer l'app. Ainsi tout s'affiche d'un coup, sans pop-in.
 *
 * Ajoute une image dans app/assets/images/ → elle est préchargée automatiquement,
 * aucune config à modifier. `minDuration` garantit un temps d'écran minimal
 * (le moment « cachet de cire » de la marque) même si le cache est déjà chaud.
 */
export interface PreloaderOptions {
  /** Durée d'affichage minimale du loader, en ms. */
  minDuration?: number
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useAssetPreloader(opts: PreloaderOptions = {}) {
  const minDuration = opts.minDuration ?? 1200
  const loaded = ref(0)
  const total = ref(0)
  const ready = ref(false)

  const progress = computed(() => (total.value === 0 ? 100 : Math.round((loaded.value / total.value) * 100)))

  function loadImage(url: string): Promise<void> {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = img.onerror = () => {
        loaded.value++
        resolve()
      }
      img.src = url
    })
  }

  async function preload(): Promise<void> {
    const started = performance.now()

    // Découverte statique de toutes les images (URLs hashées par Vite).
    const modules = import.meta.glob('../assets/images/**/*.{png,jpg,jpeg,webp,avif,svg}', {
      eager: true,
      query: '?url',
      import: 'default',
    }) as Record<string, string>
    const urls = Object.values(modules)
    total.value = urls.length

    await Promise.all(urls.map(loadImage))

    // Polices web (évite le saut de Pirata One).
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      try {
        await document.fonts.ready
      } catch {
        /* pas bloquant */
      }
    }

    const elapsed = performance.now() - started
    if (elapsed < minDuration) await sleep(minDuration - elapsed)
    ready.value = true
  }

  return { loaded, total, progress, ready, preload }
}
