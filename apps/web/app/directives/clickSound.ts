/**
 * `v-click-sound` — joue le bruitage de clic sur n'importe quel élément.
 *
 * Une valeur falsy neutralise la directive : `v-click-sound="canClick"` sert aux
 * éléments qui restent cliquables au sens du DOM mais inactifs au sens du jeu
 * (un dé pendant le tour de l'IA, par exemple). Sans valeur, le son joue
 * toujours — un `<button disabled>` n'émet de toute façon aucun clic.
 *
 * La directive est enregistrée dans `~/plugins/click-sound.ts` : c'est Nuxt qui
 * crée et monte l'application Vue, il n'y a pas de `createApp()` à nous.
 */
import type { Directive } from 'vue'
import clickSound from '~/assets/sounds/click-sound.mp3'

const VOLUME = 0.5

/**
 * Gabarit décodé une seule fois. Chaque clic en joue un CLONE : un `Audio`
 * unique et partagé devrait se rembobiner à chaque appel, donc deux clics
 * rapprochés se couperaient l'un l'autre.
 */
let template: HTMLAudioElement | null = null

function playClickSound(): void {
  // `Audio` n'existe que dans le navigateur — la directive doit rester inerte ailleurs.
  if (!import.meta.client) return
  if (!template) {
    template = new Audio(clickSound)
    template.preload = 'auto'
  }
  const sound = template.cloneNode() as HTMLAudioElement
  sound.volume = VOLUME
  // Un refus du navigateur (politique d'autoplay) ne doit jamais casser l'interface.
  void sound.play().catch(() => {})
}

/** Écouteur et état posés par élément : `unmounted` doit pouvoir les retirer. */
const handlers = new WeakMap<HTMLElement, () => void>()
const enabled = new WeakMap<HTMLElement, boolean>()

export const clickSoundDirective: Directive<HTMLElement, boolean | undefined> = {
  mounted(el, binding) {
    enabled.set(el, binding.value !== false)
    // L'écouteur lit le WeakMap au moment du clic : `updated` peut ainsi
    // basculer l'état sans avoir à ré-attacher quoi que ce soit.
    const handler = () => {
      if (enabled.get(el)) playClickSound()
    }
    handlers.set(el, handler)
    el.addEventListener('click', handler)
  },

  updated(el, binding) {
    enabled.set(el, binding.value !== false)
  },

  unmounted(el) {
    const handler = handlers.get(el)
    if (handler) el.removeEventListener('click', handler)
    handlers.delete(el)
    enabled.delete(el)
  }
}
