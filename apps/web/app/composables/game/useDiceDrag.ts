/**
 * Saisir un dé et le déposer où l'on veut.
 *
 * Le clic reste la voie courte — garder un dé, le reprendre — et le glissé
 * s'ajoute pour ceux qui aiment ranger : on choisit SON emplacement, on
 * regroupe, on renvoie un dé au centre.
 *
 * Pointeur brut plutôt que le glisser-déposer natif du navigateur : celui-ci
 * fabrique une vignette fantôme à partir du rendu, ce qui donne un aplat sans
 * relief pour un cube en 3D. Ici, le dé saisi reste le vrai dé, simplement
 * décollé du plateau.
 *
 * Un geste court n'est PAS un glissé : en dessous du seuil, on laisse le clic
 * faire son travail, sinon garder un dé d'une main pressée deviendrait un
 * concours d'immobilité.
 */

/** En deçà, le geste reste un clic. Au-delà, le dé décolle. */
const DRAG_THRESHOLD_PX = 6

export interface DiceDrop {
  /** Emplacement visé, ou `null` pour un retour au centre du plateau. */
  slot: number | null
  dieId: number
}

export function useDiceDrag(onDrop: (drop: DiceDrop) => void) {
  /** Dé actuellement en main, ou `null`. */
  const heldDie = ref<number | null>(null)
  /** Position du pointeur, pour dessiner le dé sous le doigt. */
  const at = reactive({ x: 0, y: 0 })
  /** Emplacement survolé, pour l'éclairer avant le lâcher. */
  const hovered = ref<number | null>(null)

  let candidate: number | null = null
  let origin = { x: 0, y: 0 }

  function grab(dieId: number, event: PointerEvent): void {
    // Bouton droit ou milieu : ce n'est pas une saisie.
    if (event.button !== 0) return
    candidate = dieId
    origin = { x: event.clientX, y: event.clientY }
    at.x = event.clientX
    at.y = event.clientY
  }

  /** Ce qu'il y a sous le pointeur : un emplacement, le plateau, ou rien. */
  function targetAt(x: number, y: number): DiceDrop['slot'] | undefined {
    const el = document.elementFromPoint(x, y)
    if (!el) return undefined
    const slot = el.closest<HTMLElement>('[data-slot]')
    if (slot) return Number(slot.dataset.slot)
    // Le centre du plateau reprend le dé : c'est le geste inverse du rangement.
    return el.closest('.board-dice') ? null : undefined
  }

  function move(event: PointerEvent): void {
    if (candidate === null) return
    at.x = event.clientX
    at.y = event.clientY

    if (heldDie.value === null) {
      const travelled = Math.hypot(event.clientX - origin.x, event.clientY - origin.y)
      if (travelled < DRAG_THRESHOLD_PX) return
      heldDie.value = candidate
    }
    const target = targetAt(event.clientX, event.clientY)
    hovered.value = target === undefined ? null : target
  }

  function release(event: PointerEvent): void {
    const dieId = heldDie.value
    // Sous le seuil, on n'a jamais décollé : le clic du bouton fera le travail.
    if (dieId !== null) {
      const target = targetAt(event.clientX, event.clientY)
      if (target !== undefined) onDrop({ slot: target, dieId })
    }
    candidate = null
    heldDie.value = null
    hovered.value = null
  }

  /**
   * La corde se ferme sur tout le document, pas seulement sur le dé pris : le
   * pointeur traverse le plateau et des boutons pendant le geste, et chacun
   * réimposerait son propre curseur (cf. `.is-grabbing` dans `_components.scss`).
   */
  watch(heldDie, (held) => {
    if (!import.meta.client) return
    document.body.classList.toggle('is-grabbing', held !== null)
  })

  onMounted(() => {
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
    // Quitter la page en plein glissé laisserait la corde fermée pour de bon.
    document.body.classList.remove('is-grabbing')
  })

  return { heldDie, hovered, at, grab }
}
