import { describe, expect, it } from 'vitest'
import { BOARD_PERSPECTIVE, boardTilt } from '~/utils/boardTilt'
import { CARD_ZONE, zoneStyle } from '~/utils/boardZones'
import { DICE_THROW, headingFor, scatterFor } from '~/utils/diceThrow'

/**
 * La géométrie du plateau. Ces fonctions n'ont ni écran ni DOM : ce sont des
 * mathématiques, et c'est ce qui les rend éprouvables — là où le rendu, lui,
 * se juge à l'œil.
 *
 * On y vérifie les PROPRIÉTÉS, pas des nombres : le décor changera, les
 * réglages avec, mais l'éventail devra toujours s'ouvrir depuis le centre.
 */
describe('perspective du plateau', () => {
  it('au centre, un dé ne montre presque que sa face avant', () => {
    const centre = boardTilt(0.5, 0.5)
    expect(centre.y).toBeCloseTo(0, 5)
    expect(centre.z).toBeCloseTo(0, 5)
  })

  it('l’éventail s’OUVRE depuis le centre : les deux bords s’opposent', () => {
    const gauche = boardTilt(0, 0.5)
    const droite = boardTilt(1, 0.5)

    expect(gauche.y).toBeGreaterThan(0)
    expect(droite.y).toBeLessThan(0)
    expect(gauche.y).toBeCloseTo(-droite.y, 5)
    // Le roulis suit le même écart, en sens inverse du lacet.
    expect(gauche.z).toBeLessThan(0)
    expect(droite.z).toBeGreaterThan(0)
  })

  it('la plongée interpole du haut vers le bas du plateau', () => {
    // On vérifie l'INTERPOLATION, pas le sens : lequel du haut ou du bas plonge
    // le plus est un réglage de décor, qui bougera avec le décor.
    const haut = boardTilt(0.5, 0).x
    const bas = boardTilt(0.5, 1).x
    expect(haut).toBeCloseTo(-BOARD_PERSPECTIVE.pitchTop, 5)
    expect(bas).toBeCloseTo(-BOARD_PERSPECTIVE.pitchBottom, 5)
    // Au dixième de degré près : c'est la précision que la fonction s'impose,
    // au-delà on ne ferait qu'agiter le DOM.
    expect(boardTilt(0.5, 0.5).x).toBe(Math.round(((haut + bas) / 2) * 10) / 10)
  })

  it('hors du plateau, l’inclinaison se borne au bord', () => {
    expect(boardTilt(-3, 0.5)).toEqual(boardTilt(0, 0.5))
    expect(boardTilt(0.5, 9)).toEqual(boardTilt(0.5, 1))
  })

  it('un dé RANGÉ dans son cadre exagère le relief, en s’inversant', () => {
    const libre = boardTilt(1, 0.5)
    const range = boardTilt(1, 0.5, BOARD_PERSPECTIVE, { kind: 'seated' })
    expect(Math.sign(range.y)).toBe(-Math.sign(libre.y))
  })
})

describe('zones posées du décor', () => {
  it('rend des pourcentages et des degrés prêts à poser', () => {
    const style = zoneStyle(CARD_ZONE)
    expect(style.left).toBe(`${CARD_ZONE.left}%`)
    expect(style.width).toBe(`${CARD_ZONE.width}%`)
    expect(style['--tilt-y']).toBe(`${CARD_ZONE.tiltY}deg`)
  })

  it('omet la hauteur quand la zone suit son contenu', () => {
    expect(zoneStyle({ left: 1, top: 2, width: 3, tiltX: 0, tiltY: 0, tiltZ: 0 }).height).toBeUndefined()
  })
})

describe('jet de dés', () => {
  it('deux dés d’une même volée ne tombent pas au même endroit', () => {
    const a = scatterFor(0, 1)
    const b = scatterFor(1, 1)
    expect(a).not.toEqual(b)
  })

  it('le même dé, au même jet, retombe TOUJOURS au même endroit', () => {
    // Sans quoi le moindre rendu de Vue ferait sauter les dés sur la table.
    expect(scatterFor(3, 7)).toEqual(scatterFor(3, 7))
    expect(scatterFor(3, 7)).not.toEqual(scatterFor(3, 8))
  })

  it('la dispersion reste dans les bornes du réglage', () => {
    for (let id = 0; id < 8; id++) {
      const { x, y, angle } = scatterFor(id, 2)
      expect(Math.abs(x)).toBeLessThanOrEqual(DICE_THROW.scatter)
      expect(Math.abs(y)).toBeLessThanOrEqual(DICE_THROW.scatter)
      expect(Math.abs(angle)).toBeLessThanOrEqual(DICE_THROW.layAngle)
    }
  })

  it('la volée s’ouvre en éventail autour du cap', () => {
    const premier = headingFor(0, 8)
    const dernier = headingFor(7, 8)
    expect(premier).toBeLessThan(dernier)
    expect((premier + dernier) / 2).toBeCloseTo(DICE_THROW.heading, 5)
  })

  it('un dé seul part droit sur le cap', () => {
    expect(headingFor(0, 1)).toBe(DICE_THROW.heading)
  })
})
