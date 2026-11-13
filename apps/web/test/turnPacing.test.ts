import { describe, expect, it } from 'vitest'
import { ROLL_SETTLE_MS } from '@rf/protocol'
import { DICE_THROW } from '../app/utils/diceThrow'

describe('cadence de fin de tour', () => {
  // Le serveur attend ROLL_SETTLE_MS avant de compter le récapitulatif. Si la
  // volée réglée au labo devenait plus longue, le score serait de nouveau
  // amputé — et « À toi de jouer » le rattraperait.
  it('la pause du serveur couvre le vol complet des dés', () => {
    const flight = DICE_THROW.duration + 7 * DICE_THROW.stagger
    expect(flight).toBeLessThanOrEqual(ROLL_SETTLE_MS)
  })
})
