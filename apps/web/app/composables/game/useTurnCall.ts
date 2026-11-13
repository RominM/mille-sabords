import type { TurnState } from '@rf/engine'
// Le temps que l'annonce reste à l'écran. Partagé : le serveur l'ajoute au
// temps de décision, pour que la lire ne coûte rien au joueur.
import { TURN_CALL_MS } from '@rf/protocol'

/**
 * « À toi de jouer » au début de NOTRE tour.
 *
 * Le déclencheur est la phase qui repasse à `first-roll` : c'est la seule
 * marque d'un tour qui S'OUVRE. Se fier au changement de joueur courant
 * l'afficherait trop tôt — la rotation a lieu à la fin du tour précédent,
 * pendant que son résultat est encore à l'écran.
 */
export function useTurnCall(turn: Ref<TurnState | null>, mine: Ref<boolean>) {
  const announcing = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function stop(): void {
    if (timer) clearTimeout(timer)
    timer = null
  }

  onBeforeUnmount(stop)

  watch(
    () => turn.value?.phase,
    (phase, before) => {
      if (phase !== 'first-roll' || phase === before || !mine.value) return
      stop()
      announcing.value = true
      timer = setTimeout(() => (announcing.value = false), TURN_CALL_MS)
    }
  )

  return { announcing }
}
