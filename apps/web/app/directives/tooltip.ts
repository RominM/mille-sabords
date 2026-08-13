/**
 * Infobulle au survol : `v-tooltip="'Barème des points'"`.
 *
 * Pas l'attribut `title` du navigateur : il met une seconde à sortir, ne se
 * style pas, et se place où il veut. Pas non plus un composant à envelopper
 * autour de chaque bouton — l'infobulle doit pouvoir se poser sur N'IMPORTE
 * QUEL élément sans toucher à sa structure. Une directive est exactement l'outil.
 *
 * La bulle est écrite dans `body`, pas à côté de son élément : `.game__board`
 * déclare `container-type: size`, et une bulle posée dedans serait rognée par
 * la première zone à `overflow: hidden` — le tiroir latéral, par exemple.
 *
 * Elle suit aussi le FOCUS, pas seulement la souris : un bouton atteint au
 * clavier doit livrer la même information.
 */
import type { Directive } from 'vue'

/** Laps avant l'apparition : assez court pour servir, assez long pour ne pas
 * clignoter quand la souris ne fait que traverser. */
const DELAY_MS = 260
/** Distance entre l'élément et la bulle. */
const GAP_PX = 10

let bubble: HTMLElement | null = null
let timer: ReturnType<typeof setTimeout> | null = null

function ensureBubble(): HTMLElement {
  if (bubble) return bubble
  bubble = document.createElement('div')
  bubble.className = 'tooltip'
  bubble.setAttribute('role', 'tooltip')
  document.body.appendChild(bubble)
  return bubble
}

function hide(): void {
  if (timer) clearTimeout(timer)
  timer = null
  bubble?.classList.remove('tooltip--shown')
}

/**
 * Place la bulle au-dessus de l'élément, recentrée — et bascule dessous quand
 * il n'y a pas la place en haut. Les mesures se font après affichage, sinon la
 * bulle n'a pas encore de dimensions.
 */
function place(el: HTMLElement, text: string): void {
  const tip = ensureBubble()
  tip.textContent = text
  tip.classList.add('tooltip--shown')

  const anchor = el.getBoundingClientRect()
  const size = tip.getBoundingClientRect()

  const above = anchor.top - size.height - GAP_PX
  const below = anchor.bottom + GAP_PX
  const top = above >= 0 ? above : below

  // Bornée à la fenêtre : une bulle à moitié sortie ne se lit pas.
  const left = Math.min(
    Math.max(GAP_PX, anchor.left + anchor.width / 2 - size.width / 2),
    window.innerWidth - size.width - GAP_PX
  )

  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
}

const textOf = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const tooltipDirective: Directive<HTMLElement, string | undefined> = {
  mounted(el, binding) {
    const show = (): void => {
      const text = textOf(binding.value)
      if (!text) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => place(el, text), DELAY_MS)
    }

    // Rangés sur l'élément pour que `unmounted` puisse les retirer : sans quoi
    // chaque bouton détruit laisserait ses écouteurs derrière lui.
    const handlers = { show, hide }
    ;(el as HTMLElement & { _tooltip?: typeof handlers })._tooltip = handlers

    el.addEventListener('mouseenter', show)
    el.addEventListener('focus', show)
    el.addEventListener('mouseleave', hide)
    el.addEventListener('blur', hide)
    // Un clic ferme : la bulle a fait son travail, elle ne doit pas rester
    // devant ce qu'on vient d'ouvrir.
    el.addEventListener('pointerdown', hide)
  },

  unmounted(el) {
    const handlers = (el as HTMLElement & { _tooltip?: { show: () => void; hide: () => void } })
      ._tooltip
    if (!handlers) return
    el.removeEventListener('mouseenter', handlers.show)
    el.removeEventListener('focus', handlers.show)
    el.removeEventListener('mouseleave', handlers.hide)
    el.removeEventListener('blur', handlers.hide)
    el.removeEventListener('pointerdown', handlers.hide)
    // L'élément part peut-être alors que sa bulle est encore à l'écran.
    hide()
  }
}
