/**
 * Nuxt importe `ref`, `computed`, `watch`… tout seul dans chaque fichier. Hors
 * de Nuxt, ces noms n'existent pas et les sources ne les importent pas : on les
 * pose donc en variables globales, ce qui reproduit exactement ce que le
 * compilateur fait d'habitude.
 *
 * Ne rien ajouter ici qui vienne de NUXT lui-même (`useState`, `useRouter`…) :
 * un composable qui en dépend n'est pas testable de cette façon, et le
 * maquiller donnerait un test qui ne prouve rien.
 */
import * as vue from 'vue'

Object.assign(globalThis, vue)
