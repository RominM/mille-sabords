/**
 * Quel tiroir latéral est ouvert — au plus UN à la fois.
 *
 * L'état est au niveau du MODULE, donc partagé par tous les tiroirs : c'est ce
 * qui leur permet de se refermer les uns les autres sans se connaître. Les
 * planches se superposent, décalées de leur seule languette ; deux ouvertes en
 * même temps se masqueraient.
 */
const openPanel = ref<string | null>(null)

export const useSidePanels = () => {
  const isOpen = (id: string): boolean => openPanel.value === id

  /** Ouvre ce tiroir, ou le referme s'il l'était déjà. */
  const toggle = (id: string): void => {
    openPanel.value = openPanel.value === id ? null : id
  }

  /**
   * Ouvre ce tiroir, sans jamais le refermer. Le tutoriel montre des contenus
   * qui vivent dans les tiroirs : il doit pouvoir les ouvrir sans risquer de
   * refermer celui qu'il vient d'ouvrir.
   */
  const open = (id: string | null): void => {
    openPanel.value = id
  }

  return { openPanel, isOpen, toggle, open }
}
