/**
 * Bruitages d'interface. Deux directives sur le même son :
 *
 *   v-click-sound   joue au clic   — boutons d'action (Embarquer, cachets, dés)
 *   v-hover-sound   joue au survol — éléments dont le survol EST l'action
 *                                    (la navigation de l'accueil change de vue
 *                                    au survol)
 *
 * Les deux COHABITENT sur un bouton ordinaire : l'oreille y entend deux moments
 * distincts — on arrive dessus, puis on appuie. Ce qu'il ne faut pas, c'est les
 * réunir sur un élément dont le SURVOL EST déjà l'action (la navigation de
 * l'accueil change de vue au survol) : le son dirait deux fois la même chose.
 *
 * Sur écran tactile, `mouseenter` et `click` partent dans la même milliseconde ;
 * le garde-fou ci-dessous n'en laisse alors passer qu'un.
 *
 * Une valeur falsy neutralise la directive : `v-click-sound="canClick"` sert aux
 * éléments qui restent cliquables au sens du DOM mais inactifs au sens du jeu
 * (un dé pendant le tour de l'IA, par exemple). Sans valeur, le son joue
 * toujours — un `<button disabled>` n'émet de toute façon aucun événement.
 *
 * Les directives sont enregistrées dans `~/plugins/ui-sound.ts` : c'est Nuxt
 * qui crée et monte l'application Vue, il n'y a pas de `createApp()` à nous.
 */
import type { Directive } from 'vue'
import clickSound from '~/assets/sounds/click-sound.mp3'

/**
 * Deux sons ne peuvent pas partir à moins de ça. Sans ce garde-fou, balayer la
 * souris sur les quatre entrées du menu déclenche quatre sons qui se
 * chevauchent : on entend une rafale, pas un retour d'interface.
 */
const COOLDOWN_MS = 70
let lastPlayedAt = 0

/**
 * Volume des bruitages, injecté par `~/plugins/ui-sound.ts`.
 *
 * Un getter et non une valeur : les directives sont créées à l'import, hors de
 * tout contexte Nuxt, et ne peuvent donc pas appeler `useState` elles-mêmes.
 * Le plugin, lui, tourne dans ce contexte — il branche ici la lecture du
 * réglage, qui reste ainsi réactive.
 */
let readVolume: (() => number) | null = null

export function provideUiSoundVolume(getter: () => number): void {
  readVolume = getter
}

/**
 * Gabarit décodé une seule fois. Chaque lecture en joue un CLONE : un `Audio`
 * unique et partagé devrait se rembobiner à chaque appel, donc deux
 * déclenchements rapprochés se couperaient l'un l'autre.
 */
let template: HTMLAudioElement | null = null

function playUiSound(): void {
  // `Audio` n'existe que dans le navigateur — la directive doit rester inerte ailleurs.
  if (!import.meta.client) return

  // Coupés dans les réglages, les bruitages ne doivent même pas être décodés.
  const volume = readVolume?.() ?? 0
  if (volume <= 0) return

  const now = performance.now()
  if (now - lastPlayedAt < COOLDOWN_MS) return
  lastPlayedAt = now

  if (!template) {
    template = new Audio(clickSound)
    template.preload = 'auto'
  }
  const sound = template.cloneNode() as HTMLAudioElement
  sound.volume = volume
  // Un refus du navigateur (politique d'autoplay) ne doit jamais casser l'interface.
  void sound.play().catch(() => {})
}

/** Écouteur et état posés par élément : `unmounted` doit pouvoir les retirer. */
const handlers = new WeakMap<HTMLElement, () => void>()
const enabled = new WeakMap<HTMLElement, boolean>()

/** Fabrique une directive qui joue le bruitage sur l'événement DOM donné. */
function soundOn(event: 'click' | 'mouseenter'): Directive<HTMLElement, boolean | undefined> {
  return {
    mounted(el, binding) {
      enabled.set(el, binding.value !== false)
      // L'écouteur lit le WeakMap au moment du déclenchement : `updated` peut
      // ainsi basculer l'état sans avoir à ré-attacher quoi que ce soit.
      const handler = () => {
        if (enabled.get(el)) playUiSound()
      }
      handlers.set(el, handler)
      el.addEventListener(event, handler)
    },

    updated(el, binding) {
      enabled.set(el, binding.value !== false)
    },

    unmounted(el) {
      const handler = handlers.get(el)
      if (handler) el.removeEventListener(event, handler)
      handlers.delete(el)
      enabled.delete(el)
    }
  }
}

export const clickSoundDirective = soundOn('click')

// `mouseenter` et non `pointerenter` : sur écran tactile, ce dernier part au
// moment du toucher, ce qui ferait doublon avec le son de clic.
export const hoverSoundDirective = soundOn('mouseenter')
