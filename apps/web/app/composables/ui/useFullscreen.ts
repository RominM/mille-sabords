/**
 * Plein écran, à la demande du joueur.
 *
 * L'état ne se DÉVINE pas : le navigateur peut en sortir tout seul (Échap,
 * changement d'onglet) sans rien nous demander. On écoute donc
 * `fullscreenchange`, seule source honnête, plutôt que de mémoriser ce qu'on a
 * cru déclencher.
 *
 * Réserve connue : le plein écran de la TOUCHE F11 n'est pas celui de l'API —
 * le navigateur ne le déclare pas, et la case restera décochée dans ce cas.
 * C'est la limite du web, pas un bug à corriger ici.
 */
export function useFullscreen() {
  const active = ref(false)
  const supported = ref(false)

  const sync = () => {
    active.value = !!document.fullscreenElement
  }

  /** Demande le plein écran. Un refus du navigateur ne doit rien casser. */
  const enter = async (): Promise<void> => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Geste jugé insuffisant ou permission refusée : on reste en fenêtré.
    }
  }

  const exit = async (): Promise<void> => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
    } catch {
      // Idem : sortir n'est jamais une urgence.
    }
  }

  const toggle = async (): Promise<void> => {
    await (document.fullscreenElement ? exit() : enter())
  }

  onMounted(() => {
    supported.value = document.fullscreenEnabled === true
    sync()
    document.addEventListener('fullscreenchange', sync)
  })

  onUnmounted(() => document.removeEventListener('fullscreenchange', sync))

  return { active, supported, enter, exit, toggle }
}
