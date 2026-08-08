/**
 * Nuxt crée et monte lui-même l'application Vue : les directives globales
 * s'enregistrent donc ici, dans un plugin chargé automatiquement, et surtout pas
 * dans un `createApp()` maison qui ne serait jamais exécuté.
 */
import { clickSoundDirective, hoverSoundDirective, provideUiSoundVolume } from '~/directives/uiSound'
import { tooltipDirective } from '~/directives/tooltip'

export default defineNuxtPlugin(nuxtApp => {
  // Le plugin tourne dans le contexte Nuxt, les directives non : c'est donc ici
  // qu'on leur branche la lecture du réglage « Ambiance ».
  const { sfxGain } = useSoundSettings()
  provideUiSoundVolume(() => sfxGain.value)

  nuxtApp.vueApp.directive('click-sound', clickSoundDirective)
  nuxtApp.vueApp.directive('hover-sound', hoverSoundDirective)
  // Même raison d'être ici : Nuxt monte l'application lui-même, il n'y a pas de
  // `createApp()` à nous où enregistrer une directive globale.
  nuxtApp.vueApp.directive('tooltip', tooltipDirective)
})
