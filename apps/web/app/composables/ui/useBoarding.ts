/**
 * L'embarquement : ce moment entre le clic et le plateau.
 *
 * L'écran de chargement vivait dans `/game`, donc il n'apparaissait qu'une fois
 * la page ARRIVÉE — après le chargement de sa route, de ses composants et la
 * mise en place de la table. Tout ce temps-là, le joueur restait sur un accueil
 * figé qui ne répondait plus : le plus mauvais moment pour ne rien montrer.
 *
 * L'état vit donc au-dessus des routes, dans `app.vue` : celui qui déclenche le
 * départ l'ouvre AU CLIC, et la page d'arrivée le referme quand elle est prête.
 *
 * État de MODULE, comme les tiroirs : deux écrans successifs doivent parler du
 * même embarquement, et il ne survit pas à un rechargement — ce qui est juste,
 * puisqu'un rechargement recommence le voyage.
 */
const boarding = ref(false)
const hint = ref('')

/**
 * Filet de sécurité : si la navigation échoue ou si la page d'arrivée ne
 * referme jamais, l'écran ne doit pas rester bloqué sur le chargeur. Généreux —
 * il ne sert qu'aux cas anormaux, jamais au cours normal.
 */
const SAFETY_MS = 12_000
let safety: ReturnType<typeof setTimeout> | null = null

export const useBoarding = () => {
  function startBoarding(message = 'On embarque…'): void {
    hint.value = message
    boarding.value = true
    if (safety) clearTimeout(safety)
    safety = setTimeout(() => (boarding.value = false), SAFETY_MS)
  }

  function endBoarding(): void {
    if (safety) clearTimeout(safety)
    safety = null
    boarding.value = false
  }

  return { boarding, hint, startBoarding, endBoarding }
}
