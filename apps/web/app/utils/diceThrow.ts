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
}

/** Valeurs choisies par Romin sur la piste du labo. */
export const DICE_THROW: DiceThrow = {
  travel: 10,
  heading: -161,
  duration: 1200,
  spread: 62,
  stagger: 70
}

/**
 * Direction du i-ème dé d'une volée. L'écart est réparti autour de la direction
 * choisie, pas ajouté au hasard : deux jets successifs se ressemblent, ce qui
 * évite qu'un dé parte de travers sans raison visible.
 */
export function headingFor(index: number, count: number, settings: DiceThrow = DICE_THROW): number {
  if (settings.spread === 0 || count < 2) return settings.heading
  const place = index / (count - 1) - 0.5
  return settings.heading + place * settings.spread
}
