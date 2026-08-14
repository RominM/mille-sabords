/**
 * Rangement des dés gardés dans les huit cadres du plateau.
 *
 * C'est de la MISE EN SCÈNE, pas une règle : le moteur se moque de savoir dans
 * quel cadre un dé est posé. Mais un joueur, lui, aime regrouper ses dés — et
 * le glisser-déposer ne veut rien dire sans cette table.
 *
 * Extrait de `useGame` : le rangement ne dépend d'aucun transport, d'aucun
 * minuteur et d'aucune partie. Il ne connaît que des identifiants de dés et des
 * places, ce qui le rend éprouvable seul.
 */

/** Huit cadres, comme huit dés : la rangée du décor n'en accueille pas plus. */
export const SLOT_COUNT = 8

export function useDiceSlots(count: number = SLOT_COUNT) {
  const slots = ref<(number | null)[]>(Array(count).fill(null))

  const slotOfDie = (id: number): number => slots.value.indexOf(id)

  /**
   * Range un dé dans un emplacement précis. Si la place est prise, les deux dés
   * ÉCHANGENT : c'est le geste attendu quand on réorganise à la main, et ça
   * évite d'avoir à vider une case avant de la remplir.
   */
  function moveToSlot(dieId: number, target: number): void {
    if (target < 0 || target >= count) return
    const next = [...slots.value]
    const from = next.indexOf(dieId)
    const occupant = next[target] ?? null

    if (from !== -1) next[from] = occupant
    else if (occupant !== null) {
      // Le dé arrive du plateau et la case est prise : l'occupant retourne au
      // premier creux libre plutôt que d'être renvoyé au centre.
      const free = next.indexOf(null)
      if (free !== -1) next[free] = occupant
    }
    next[target] = dieId
    slots.value = next
  }

  /**
   * Aligne la table des emplacements sur les dés réellement gardés. Certains le
   * deviennent SANS clic — une tête de mort se verrouille toute seule —, et un
   * dé relancé libère sa place. Les positions choisies à la main survivent.
   */
  function syncSlots(kept: number[]): void {
    const next = slots.value.map((id) => (id !== null && kept.includes(id) ? id : null))
    for (const id of kept) {
      if (next.includes(id)) continue
      const free = next.indexOf(null)
      if (free !== -1) next[free] = id
    }
    slots.value = next
  }

  /** Vide la rangée — un nouveau tour repart d'une table nette. */
  function clearSlots(): void {
    slots.value = Array(count).fill(null)
  }

  return { slots, slotOfDie, moveToSlot, syncSlots, clearSlots }
}
