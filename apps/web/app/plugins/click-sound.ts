/**
 * Nuxt crée et monte lui-même l'application Vue : les directives globales
 * s'enregistrent donc ici, dans un plugin chargé automatiquement, et surtout pas
 * dans un `createApp()` maison qui ne serait jamais exécuté.
 */
import { clickSoundDirective } from '~/directives/clickSound'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.directive('click-sound', clickSoundDirective)
})
