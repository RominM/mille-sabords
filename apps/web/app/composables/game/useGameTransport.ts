/**
 * Couture entre l'interface et l'AUTORITÉ des règles.
 *
 * Le front n'appelle plus le moteur : il envoie des commandes et observe un
 * état publié. Aujourd'hui l'autorité est une instance `Game` dans l'onglet ;
 * demain ce sera le serveur WebSocket. Seule l'implémentation du transport
 * changera — `useGame` et les composants, eux, ne verront pas la différence.
 *
 * C'est aussi ce qui rend la reprise après rechargement possible : l'état ne
 * vivra plus dans un `ref` perdu au F5, mais chez celui qui fait autorité.
 */
import type { Ref, ShallowRef } from 'vue'
import { Game, IllegalActionError, type GameState, type TurnAction } from '@rf/engine'

/**
 * Les commandes que le client peut émettre. Le serveur les recevra telles
 * quelles, à ceci près qu'il vérifiera QUI a le droit de les envoyer — un joueur
 * ne pourra pas jouer le tour d'un autre.
 */
export type GameCommand =
  /** Ouvre la partie. En réseau : créer ou rejoindre la salle. */
  | { type: 'open'; players: { id: string; name: string; bot?: boolean }[] }
  | { type: 'start-turn' }
  | { type: 'act'; action: TurnAction }
  | { type: 'timeout' }

export interface GameTransport {
  /** Dernier état connu. Nouvelle identité à chaque publication (réactivité). */
  state: ShallowRef<GameState | null>
  /** Dernière commande refusée par l'autorité, en clair pour le joueur. */
  lastError: Ref<string>
  /**
   * Vrai quand l'autorité est DISTANTE et pilote elle-même le déroulement :
   * enchaînement des tours, expiration des décisions, coups des IA. Le client
   * se contente alors d'obéir à ce qu'il reçoit.
   *
   * Faux en local : c'est l'onglet qui doit faire tourner la partie.
   */
  remote: boolean
  send: (cmd: GameCommand) => void
  close: () => void
}

/**
 * Autorité locale : le moteur tourne dans l'onglet. C'est le mode solo, et le
 * filet de sécurité du découplage — tant qu'il se comporte à l'identique, le
 * refactor n'a rien cassé.
 */
export const createLocalTransport = (): GameTransport => {
  const state = shallowRef<GameState | null>(null)
  const lastError = ref('')
  let game: Game | null = null

  /**
   * Le moteur mute son état EN PLACE. Vue met en cache les `computed` par
   * identité : republier le même objet ne déclencherait aucun rendu. On publie
   * donc un CLONE — c'est aussi la forme qu'aura un message réseau.
   */
  const publish = (): void => {
    state.value = game ? (structuredClone(game.state) as GameState) : null
  }

  const send = (cmd: GameCommand): void => {
    lastError.value = ''
    try {
      switch (cmd.type) {
        case 'open':
          game = new Game(cmd.players)
          break
        case 'start-turn':
          game?.startTurn()
          break
        case 'act':
          game?.act(cmd.action)
          break
        case 'timeout':
          game?.timeout()
          break
      }
    } catch (err) {
      // Une règle refusée n'est pas un plantage : c'est une réponse de
      // l'autorité, que le serveur renverra de la même façon.
      if (!(err instanceof IllegalActionError)) throw err
      lastError.value = err.message
    }
    publish()
  }

  return {
    state,
    lastError,
    remote: false,
    send,
    close: () => {
      game = null
      publish()
    }
  }
}

/**
 * Autorité distante : le serveur détient la partie. Le client n'émet plus que
 * des ACTIONS de jeu — ouvrir la table, enchaîner les tours et expirer les
 * décisions sont devenus des décisions du serveur, et n'ont donc plus
 * d'équivalent ici.
 */
export const createNetworkTransport = (room: ReturnType<typeof useRoom>): GameTransport => ({
  state: room.gameState,
  lastError: room.error,
  remote: true,
  send: (cmd) => {
    if (cmd.type === 'act') room.send({ t: 'act', action: cmd.action })
    // Les autres commandes sont volontairement ignorées : les émettre serait
    // demander au serveur ce qu'il fait déjà de lui-même.
  },
  close: () => room.close()
})
