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
 * Cadre de la carte, mesuré sur `ui/layout-game.webp` (1672×941) : liseré doré
 * à x 1275..1550 en haut, 1289..1571 en bas, y 261..659.
 *
 * Le cadre n'est pas d'aplomb — il penche, comme tout ce que ce grand angle a
 * photographié. On se cale au milieu du quadrilatère et c'est l'inclinaison qui
 * rattrape le reste.
 */
export const CARD_ZONE: BoardZone = {
  left: 77.3,
  top: 28.6,
  width: 15.6,
  height: 40.3,
  tiltX: -5,
  tiltY: -10,
  tiltZ: 2.5,
}

/**
 * Points en jeu, juste au-dessus du cadre : le joueur doit arbitrer « je
 * relance ou j'encaisse » sans quitter la carte des yeux. Même largeur et même
 * inclinaison, sinon les deux blocs ne semblent pas posés sur la même table.
 */
export const LIVE_ZONE: BoardZone = {
  left: 77.3,
  top: 21.2,
  width: 15.6,
  tiltX: -5,
  tiltY: -10,
  tiltZ: 2.5,
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
    '--tilt-z': `${zone.tiltZ}deg`,
  }
}
