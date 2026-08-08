/**
 * Perspective du plateau, appliquée aux dés.
 *
 * Le décor est photographié en légère plongée : la caméra est devant la table
 * et un peu au-dessus. Un dé posé à GAUCHE est donc vu par sa droite, un dé posé
 * à DROITE par sa gauche, et plus on descend vers le bord de table, plus on le
 * voit de dessus.
 *
 * Un dé qui garderait la même inclinaison partout dessinerait sa propre
 * perspective — différente de celle du bois — et flotterait au-dessus du
 * plateau au lieu d'y être posé. D'où cette fonction : l'inclinaison se DÉDUIT
 * de la place du dé, elle ne se choisit pas.
 *
 * Rappel des signes en CSS, contre-intuitifs :
 *   `rotateY` NÉGATIF montre la face de DROITE du cube ;
 *   `rotateX` NÉGATIF montre sa face du DESSUS.
 */
export interface BoardPerspective {
  /** Convergence horizontale au bord du plateau, en degrés. */
  yaw: number
  /** Plongée en HAUT du plateau — le fond de table, vu presque de face. */
  pitchTop: number
  /** Plongée en BAS du plateau — le bord proche, vu davantage de dessus. */
  pitchBottom: number
}

/**
 * Réglage du décor actuel (`ui/layout-game.webp`). Volontairement plus doux que
 * ce qu'un cube isolé supporte : l'inclinaison du plateau est faible, et un dé
 * plus incliné que la table qui le porte se voit immédiatement.
 */
export const BOARD_PERSPECTIVE: BoardPerspective = {
  yaw: 13,
  pitchTop: 4,
  pitchBottom: 10,
}

/**
 * Inclinaison d'un dé dont le centre est en (`x`, `y`), exprimés de 0 à 1 sur
 * la largeur et la hauteur du plateau. Rend des degrés, prêts à poser dans
 * `--die-tilt-x` / `--die-tilt-y`.
 */
export function boardTilt(
  x: number,
  y: number,
  perspective: BoardPerspective = BOARD_PERSPECTIVE
): { x: number; y: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const { yaw, pitchTop, pitchBottom } = perspective

  // De -1 au bord gauche à +1 au bord droit : le dé se tourne vers la caméra,
  // restée au centre.
  const ecart = (clamp(x) - 0.5) * 2
  const plongee = pitchTop + (pitchBottom - pitchTop) * clamp(y)

  return {
    x: round(-plongee),
    y: round(yaw * ecart),
  }
}

/** Un dixième de degré suffit : au-delà, on ne fait qu'agiter le DOM. */
const round = (deg: number): number => Math.round(deg * 10) / 10
