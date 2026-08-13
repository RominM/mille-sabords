/**
 * Applique au plateau la perspective du décor.
 *
 * Chaque dé prend l'inclinaison de SA place : le décor est photographié en
 * légère plongée, un dé à gauche est vu par sa droite, un dé en bas davantage
 * de dessus. Un dé qui garderait la même inclinaison partout dessinerait sa
 * propre perspective et flotterait au-dessus de la table.
 *
 * On écrit les variables directement sur le DOM, sans passer par une donnée
 * réactive : la position d'un dé est une CONSÉQUENCE de la mise en page, et
 * relire la mise en page pour en refaire un rendu qui la modifierait tournerait
 * en rond.
 */
export function useBoardPerspective(board: Ref<HTMLElement | null>) {
  /**
   * Lit toutes les positions, PUIS écrit toutes les variables. Entrelacer les
   * deux ferait recalculer la mise en page à chaque dé.
   */
  function apply(): void {
    const plateau = board.value
    if (!plateau) return
    const box = plateau.getBoundingClientRect()
    if (!box.width) return

    const cells = [...plateau.querySelectorAll<HTMLElement>('[class*="__cell"]')]
    const tilts = cells.map((cell) => {
      const rect = cell.getBoundingClientRect()
      return boardTilt(
        (rect.left + rect.width / 2 - box.left) / box.width,
        (rect.top + rect.height / 2 - box.top) / box.height,
        BOARD_PERSPECTIVE,
        // Les dés des huit cadres ne se règlent pas comme ceux jetés sur la
        // table : petits et encastrés, ils demandent leur propre dosage.
        { kind: cell.closest('.board-slots') ? 'seated' : 'die' }
      )
    })

    cells.forEach((cell, index) => {
      const tilt = tilts[index]!
      cell.style.setProperty('--die-tilt-x', `${tilt.x}deg`)
      cell.style.setProperty('--die-tilt-y', `${tilt.y}deg`)
      cell.style.setProperty('--die-tilt-z', `${tilt.z}deg`)
    })
  }

  // Les dés se déplacent à chaque rendu — un dé gardé quitte le centre pour un
  // cadre —, et le plateau se redimensionne avec la fenêtre.
  onUpdated(apply)
  onMounted(() => {
    apply()
    window.addEventListener('resize', apply)
  })
  onBeforeUnmount(() => window.removeEventListener('resize', apply))

  return { apply }
}
