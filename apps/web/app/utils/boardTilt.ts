/**
 * Perspective du plateau, appliquée aux dés.
 *
 * Le décor est photographié en légère plongée, au GRAND ANGLE : les cadres
 * dessinés sur le bois s'ouvrent en éventail depuis le centre — on voit le
 * flanc gauche de celui de gauche, le flanc droit de celui de droite. Les dés
 * doivent s'ouvrir de la même façon, sinon ils contredisent le bois sur lequel
 * ils sont posés.
 *
 * C'est l'inverse de ce qu'on attend d'un objectif long, où tout convergerait
 * vers le centre : ici la perspective DIVERGE. Au milieu du plateau, un dé ne
 * montre presque que sa face avant.
 *
 * S'y ajoute la plongée : plus un dé descend vers le bord de table, plus on le
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
  /**
   * Multiplicateur appliqué aux dés RANGÉS dans les huit cadres.
   *
   * Exagération assumée, et non une erreur de perspective : à 44 px de côté, un
   * cube incliné de 8° ne montre aucune face latérale et se lit comme un
   * autocollant. Il faut voir un bout de flanc pour croire au volume — donc
   * pour croire au creux qui l'accueille.
   */
  seatedRelief: number
  /**
   * Multiplicateur des objets PLATS et grands — le cadre de la carte, le
   * bandeau des points. Les valeurs ci-dessus sont réglées pour que des cubes
   * de 40 px se lisent : appliquées telles quelles à une carte de 250 px, elles
   * la coucheraient. Un objet plus grand a besoin de moins d'exagération, pas
   * de plus.
   */
  flatRelief: number
  /**
   * ROULIS au bord du plateau, en degrés — la rotation dans le PLAN de l'image.
   *
   * C'est le terme qui manquait, et le seul qui puisse rendre les arêtes d'un
   * dé parallèles à celles de son cadre : un grand angle ne se contente pas
   * d'incliner les objets vers la caméra, il les fait aussi PIVOTER à mesure
   * qu'on s'écarte du centre. Sans lui, un dé touche son cadre d'un coin et
   * flotte de l'autre, quoi qu'on fasse avec les deux autres axes.
   */
  roll: number
}

/**
 * Réglage du décor actuel (`ui/layout-game.webp`). Volontairement plus doux que
 * ce qu'un cube isolé supporte : l'inclinaison du plateau est faible, et un dé
 * plus incliné que la table qui le porte se voit immédiatement.
 */
export const BOARD_PERSPECTIVE: BoardPerspective = {
  yaw: 28,
  pitchTop: 14,
  pitchBottom: 12,
  // Négatif, et c'est voulu : réglé à l'écran, le contre-champ est ce qui fait
  // entrer les dés dans leurs cadres. Le signe n'a rien d'évident ici — le
  // décor est une photo, pas une projection qu'on pourrait déduire.
  seatedRelief: -1,
  // Une carte de 250 px n'a pas besoin de l'exagération qui rend un cube de
  // 40 px lisible : on amortit.
  flatRelief: 0.45,
  roll: 14
}

/**
 * Inclinaison d'un dé dont le centre est en (`x`, `y`), exprimés de 0 à 1 sur
 * la largeur et la hauteur du plateau. Rend des degrés, prêts à poser dans
 * `--die-tilt-x` / `--die-tilt-y`.
 */
export function boardTilt(
  x: number,
  y: number,
  perspective: BoardPerspective = BOARD_PERSPECTIVE,
  { kind = 'die' }: { kind?: 'die' | 'seated' | 'flat' } = {}
): { x: number; y: number; z: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const { yaw, pitchTop, pitchBottom, seatedRelief, flatRelief, roll } = perspective
  const gain = kind === 'seated' ? seatedRelief : kind === 'flat' ? flatRelief : 1

  // De -1 au bord gauche à +1 au bord droit.
  const ecart = (clamp(x) - 0.5) * 2
  const plongee = pitchTop + (pitchBottom - pitchTop) * clamp(y)

  return {
    x: round(-plongee * gain),
    // `rotateY` NÉGATIF montre la face de DROITE : c'est donc l'écart NÉGATÉ
    // qui ouvre l'éventail — l'objet de gauche montre son flanc gauche.
    y: round(-yaw * ecart * gain),
    // Le roulis suit le même écart. Il s'applique EN DERNIER, dans le plan de
    // l'écran : c'est lui qui aligne les arêtes sur celles du décor.
    z: round(roll * ecart * gain)
  }
}

/** Un dixième de degré suffit : au-delà, on ne fait qu'agiter le DOM. */
const round = (deg: number): number => Math.round(deg * 10) / 10
