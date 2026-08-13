/**
 * Blocs POSÉS à un endroit précis du décor : le cadre de la carte Pirate, le
 * bandeau des points en jeu.
 *
 * Contrairement aux dés, ils ne se déduisent pas d'un modèle. Un dé peut être
 * n'importe où sur la table, et son inclinaison doit suivre — d'où `boardTilt`.
 * La carte, elle, va dans UN cadre dessiné, à UNE place, pour toute la partie :
 * faire dériver ses angles d'une formule générique ne ferait que déplacer le
 * réglage sans le simplifier. On les donne donc en clair.
 *
 * Position et taille sont en POURCENTAGE du plateau, comme le reste des zones :
 * le décor garde son ratio quelle que soit la fenêtre, donc les mêmes nombres
 * valent à toutes les tailles.
 *
 * Ces valeurs se règlent à l'œil sur `pages/test.vue`, qui les rejoue sur le
 * vrai décor et rend le bloc à recopier ici.
 */
export interface BoardZone {
  left: number
  top: number
  width: number
  /** Omise, la hauteur suit le contenu — c'est le cas du bandeau des points. */
  height?: number
  /** Plongée, en degrés. Négatif = on voit le dessus. */
  tiltX: number
  /** Lacet, en degrés. Négatif = on voit le flanc droit. */
  tiltY: number
  /** Roulis dans le plan de l'écran : c'est lui qui aligne sur le cadre dessiné. */
  tiltZ: number
}

/**
 * Emplacement de la carte Pirate.
 *
 * À PLAT depuis que le décor ne dessine plus de cadre pour l'accueillir : il
 * n'y a plus de quadrilatère auquel se conformer, donc plus de raison de
 * déformer la carte. Elle se détache par une ombre portée, pas par une
 * perspective — c'est un objet posé sur la table, pas encastré dedans.
 */
export const CARD_ZONE: BoardZone = {
  left: 78,
  top: 28.2,
  width: 13.3,
  height: 54.7,
  tiltX: 0,
  tiltY: 0,
  tiltZ: 0
}

/**
 * Points en jeu, juste au-dessus du cadre : le joueur doit arbitrer « je
 * relance ou j'encaisse » sans quitter la carte des yeux. Même largeur et même
 * inclinaison, sinon les deux blocs ne semblent pas posés sur la même table.
 */
export const LIVE_ZONE: BoardZone = {
  left: 76.3,
  top: 20.5,
  width: 16.7,
  tiltX: -7,
  tiltY: 16.5,
  tiltZ: 3
}

/**
 * Style en ligne d'une zone. L'inclinaison passe par des variables CSS et non
 * par un `transform` ici : la rotation s'applique à l'ENFANT, le parent gardant
 * la `perspective` — sans quoi il n'y aurait aucune profondeur, juste une
 * projection plate.
 */
export function zoneStyle(zone: BoardZone): Record<string, string> {
  return {
    left: `${zone.left}%`,
    top: `${zone.top}%`,
    width: `${zone.width}%`,
    ...(zone.height === undefined ? {} : { height: `${zone.height}%` }),
    '--tilt-x': `${zone.tiltX}deg`,
    '--tilt-y': `${zone.tiltY}deg`,
    '--tilt-z': `${zone.tiltZ}deg`
  }
}
