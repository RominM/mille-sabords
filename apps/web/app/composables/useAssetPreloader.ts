/**
 * Préchargeur d'assets. Découvre TOUTES les images de `app/assets/images/`
 * (via import.meta.glob) et attend leur chargement + les polices, avant de
 * libérer l'app. Tout s'affiche alors d'un coup, sans pop-in.
 *
 * Robuste par construction : chaque image a un filet de sécurité (timeout), les
 * polices sont plafonnées, et `ready` est TOUJOURS basculé (finally) — le loader
 * ne peut jamais rester bloqué même si un asset ne se résout pas.
 */
export interface PreloaderOptions {
  /** Durée d'affichage minimale du loader, en ms. */
  minDuration?: number
  /** Filet de sécurité par image (ms) avant de la considérer comme chargée. */
  perAssetTimeout?: number
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useAssetPreloader(opts: PreloaderOptions = {}) {
  const minDuration = opts.minDuration ?? 1200
  const perAssetTimeout = opts.perAssetTimeout ?? 8000
  const loaded = ref(0)
  const total = ref(0)
  const ready = ref(false)

  const progress = computed(() => (total.value === 0 ? 100 : Math.round((loaded.value / total.value) * 100)))

  function loadImage(url: string): Promise<void> {
    return new Promise(resolve => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        loaded.value++
        resolve()
      }
      const img = new Image()
      img.onload = done
      img.onerror = done
      img.src = url
      setTimeout(done, perAssetTimeout) // ne jamais bloquer sur un asset récalcitrant
    })
  }

  async function preload(): Promise<void> {
    const started = performance.now()
    try {
      const modules = import.meta.glob('../assets/images/**/*.{png,jpg,jpeg,webp,avif,svg}', {
        eager: true,
        query: '?url',
        import: 'default',
      }) as Record<string, string>
      const urls = Object.values(modules).filter(Boolean)
      total.value = urls.length

      await Promise.all(urls.map(loadImage))

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
    }
  }

  return { loaded, total, progress, ready, preload }
}
