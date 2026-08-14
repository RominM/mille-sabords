import { beforeEach, describe, expect, it } from 'vitest'
import { useSidePanels } from '~/composables/ui/useSidePanels'
import { lastSoloSetup, rememberSoloSetup } from '~/composables/game/useTableSetup'
import { useRules } from '~/composables/ui/useRules'
import { WINNING_SCORE } from '@rf/engine'

/**
 * Les tiroirs partagent un état de MODULE : c'est ce qui leur permet de se
 * refermer les uns les autres sans se connaître. Deux planches ouvertes au même
 * endroit se masqueraient — cette exclusivité est une règle d'affichage, et
 * elle s'éprouve sans écran.
 */
describe('tiroirs latéraux', () => {
  beforeEach(() => useSidePanels().open(null))

  it('n’ouvre qu’un tiroir à la fois', () => {
    const { toggle, isOpen } = useSidePanels()
    toggle('bareme')
    expect(isOpen('bareme')).toBe(true)

    toggle('historique')
    expect(isOpen('historique')).toBe(true)
    expect(isOpen('bareme')).toBe(false)
  })

  it('la languette referme ce qu’elle a ouvert', () => {
    const { toggle, isOpen } = useSidePanels()
    toggle('bareme')
    toggle('bareme')
    expect(isOpen('bareme')).toBe(false)
  })

  it('`open` ne referme jamais ce qu’elle vient d’ouvrir', () => {
    // C'est ce qui la distingue de `toggle` : le tutoriel ouvre des tiroirs sans
    // savoir lesquels sont déjà ouverts, et ne doit pas les refermer par hasard.
    const { open, isOpen } = useSidePanels()
    open('bareme')
    open('bareme')
    expect(isOpen('bareme')).toBe(true)
  })

  it('l’état est PARTAGÉ entre deux appelants', () => {
    useSidePanels().open('historique')
    expect(useSidePanels().isOpen('historique')).toBe(true)
  })
})

/**
 * Mémoire de la dernière table solo. Elle ne sert qu'à pré-remplir : elle doit
 * donc survivre à un rechargement, et ne JAMAIS empêcher de jouer si le
 * stockage refuse.
 */
describe('mémoire de la mise en place solo', () => {
  beforeEach(() => localStorage.clear())

  const table = {
    difficulty: 'hard' as const,
    tutorial: true,
    roster: [
      { id: 'you', name: 'Barbe-Rousse', bot: false, avatar: 'x.webp' },
      { id: 'bot', name: 'Le Corsaire', bot: true }
    ]
  }

  it('rend la table telle qu’elle a été jouée', () => {
    rememberSoloSetup(table)
    expect(lastSoloSetup()).toEqual(table)
  })

  it('sans souvenir, ne rend rien plutôt qu’une table vide', () => {
    expect(lastSoloSetup()).toBeNull()
  })

  it('un souvenir illisible est ignoré, pas propagé', () => {
    localStorage.setItem('rf-last-solo', '{ ceci n’est pas du JSON')
    expect(lastSoloSetup()).toBeNull()
  })

  it('une table sans équipage n’en est pas une', () => {
    localStorage.setItem('rf-last-solo', JSON.stringify({ difficulty: 'easy', roster: [] }))
    expect(lastSoloSetup()).toBeNull()
  })
})

describe('résumé des règles', () => {
  it('annonce le seuil que le moteur applique, sans le recopier', () => {
    // Le jour où le seuil bouge, la phrase doit bouger avec.
    expect(useRules().rules.some(r => r.includes(String(WINNING_SCORE)))).toBe(true)
  })
})
