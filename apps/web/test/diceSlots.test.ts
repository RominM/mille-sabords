import { describe, expect, it } from 'vitest'
import { useDiceSlots } from '~/composables/game/useDiceSlots'

/**
 * Le rangement des dés dans les huit cadres. Aucune règle du jeu ici — mais
 * c'est ce qui rend le glisser-déposer crédible, et rien ne le vérifiait.
 */
describe('rangement des dés gardés', () => {
  it('part sur une rangée vide', () => {
    expect(useDiceSlots(4).slots.value).toEqual([null, null, null, null])
  })

  it('pose un dé à la place demandée', () => {
    const { slots, moveToSlot, slotOfDie } = useDiceSlots(4)
    moveToSlot(7, 2)
    expect(slots.value).toEqual([null, null, 7, null])
    expect(slotOfDie(7)).toBe(2)
  })

  it('ignore une place qui n’existe pas', () => {
    const { slots, moveToSlot } = useDiceSlots(4)
    moveToSlot(7, 9)
    moveToSlot(7, -1)
    expect(slots.value).toEqual([null, null, null, null])
  })

  it('deux dés déjà rangés ÉCHANGENT leur place', () => {
    const { slots, moveToSlot } = useDiceSlots(4)
    moveToSlot(1, 0)
    moveToSlot(2, 1)
    moveToSlot(1, 1)
    expect(slots.value).toEqual([2, 1, null, null])
  })

  it('un dé venu du plateau chasse l’occupant vers le premier creux', () => {
    const { slots, moveToSlot } = useDiceSlots(4)
    moveToSlot(1, 1)
    moveToSlot(9, 1)
    expect(slots.value).toEqual([1, 9, null, null])
  })

  it('sur une rangée pleine, l’occupant reste et le nouveau prend la place', () => {
    // Cas limite : il n'y a nulle part où renvoyer l'occupant. Mieux vaut un dé
    // qui disparaît de la rangée qu'un rangement incohérent — il reviendra au
    // prochain accord avec les dés gardés.
    const { slots, moveToSlot } = useDiceSlots(2)
    moveToSlot(1, 0)
    moveToSlot(2, 1)
    moveToSlot(3, 1)
    expect(slots.value).toEqual([1, 3])
  })

  describe('accord avec les dés réellement gardés', () => {
    it('installe les nouveaux venus dans les premiers creux', () => {
      const { slots, syncSlots } = useDiceSlots(4)
      syncSlots([5, 6])
      expect(slots.value).toEqual([5, 6, null, null])
    })

    it('libère la place d’un dé qui repart à la relance', () => {
      const { slots, syncSlots } = useDiceSlots(4)
      syncSlots([5, 6])
      syncSlots([6])
      expect(slots.value).toEqual([null, 6, null, null])
    })

    it('RESPECTE les places choisies à la main', () => {
      // C'est tout l'enjeu : une tête de mort qui se verrouille toute seule ne
      // doit pas rebattre le rangement que le joueur vient de composer.
      const { slots, moveToSlot, syncSlots } = useDiceSlots(4)
      moveToSlot(5, 3)
      syncSlots([5, 6])
      expect(slots.value).toEqual([6, null, null, 5])
    })

    it('ne range que ce que la rangée peut tenir', () => {
      const { slots, syncSlots } = useDiceSlots(2)
      syncSlots([1, 2, 3])
      expect(slots.value).toEqual([1, 2])
    })
  })

  it('un nouveau tour repart d’une table nette', () => {
    const { slots, moveToSlot, clearSlots } = useDiceSlots(4)
    moveToSlot(1, 0)
    clearSlots()
    expect(slots.value).toEqual([null, null, null, null])
  })
})
