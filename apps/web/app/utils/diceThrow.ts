/**
 * Le jet des dés sur le plateau, réglé à l'œil dans le labo (`/lab`).
 *
 * Les dés ROULENT : ils traversent la table et tournent parce qu'ils avancent
 * (cf. `DieCube`, mode `roll`). La distance se compte en CÔTÉS de dé, et non en
 * pixels ni en tours — c'est l'unité qui a un sens, puisqu'un cube fait un
 * quart de tour par côté parcouru.
 */
export interface DiceThrow {
  /** Distance parcourue, en côtés de dé. */
  travel: number
  /** Direction, en degrés : 0 = vers la droite, 90 = vers le bas. */
  heading: number
  /** Durée du roulé, en ms. */
  duration: number
  /**
   * Écart de direction entre les dés d'une même volée, en degrés.
   *
   * À zéro, les huit dés arrivent exactement sur le même vecteur — propre, mais
   * mécanique : une poignée de dés jetée ne part jamais au cordeau. À monter si
   * la volée fait trop « rangée d'usine ».
   */
  spread: number
  /** Décalage de départ entre deux dés d'une même volée, en ms. */
  stagger: number
  /**
   * Dispersion des dés à l'arrivée, en % de la taille d'un dé.
   *
   * Sans elle, les dés retombent en rang d'oignons : ils roulent bien, mais
   * atterrissent tous pile sur une grille, ce qui trahit l'animation. Une
   * poignée de dés jetée s'éparpille — c'est ce désordre qui fait « vrai ».
   */
  scatter: number
  /**
   * Rotation à plat de chaque dé à l'arrivée, en degrés.
   *
   * Un dé qui s'immobilise n'est presque jamais aligné sur le bord de la table.
   * Complète la dispersion : l'un déplace, l'autre oriente.
   */
  layAngle: number
}

/** Valeurs choisies par Romin sur la piste du labo. */
export const DICE_THROW: DiceThrow = {
  travel: 10,
  heading: -161,
  duration: 1200,
  spread: 62,
  stagger: 70,
  scatter: 34,
  layAngle: 14
}

/**
 * Direction du i-ème dé d'une volée. L'écart est réparti autour de la direction
 * choisie, pas ajouté au hasard : deux jets successifs se ressemblent, ce qui
 * évite qu'un dé parte de travers sans raison visible.
 */
/**
 * Bruit reproductible dans [-1, 1], à partir de deux entiers.
 *
 * Reproductible et non aléatoire : la dispersion doit être STABLE pendant tout
 * un jet. Tirée au hasard à chaque rendu, elle ferait vibrer les dés à chaque
 * seconde du minuteur.
 */
function noise(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return (n - Math.floor(n)) * 2 - 1
}

/**
 * Où le dé `id` s'immobilise, et comment il est tourné — pour le jet numéro
 * `seed`. Décalages en % de la taille d'un dé, angle en degrés.
 */
export function scatterFor(
  id: number,
  seed: number,
  settings: DiceThrow = DICE_THROW
): { x: number; y: number; angle: number } {
  return {
    x: noise(id + 1, seed) * settings.scatter,
    // Décalé sur l'autre graine, sinon x et y varieraient ensemble et les dés
    // s'aligneraient tous sur une même diagonale.
    y: noise(id + 41, seed + 7) * settings.scatter,
    angle: noise(id + 83, seed + 19) * settings.layAngle
  }
}

export function headingFor(index: number, count: number, settings: DiceThrow = DICE_THROW): number {
  if (settings.spread === 0 || count < 2) return settings.heading
  const place = index / (count - 1) - 0.5
  return settings.heading + place * settings.spread
}
