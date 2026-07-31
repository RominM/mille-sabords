/**
 * Composable de jeu : enveloppe le moteur @ms/engine dans de la réactivité Vue.
 *
 * Le moteur mute son état EN PLACE (même objet). Vue met en cache les `computed`
 * par identité : lire directement `game.state` ne déclencherait jamais de rendu.
 * On publie donc un instantané CLONÉ (`snapshot`) après chaque action — nouvelle
 * identité à chaque fois → la réactivité se propage. Aucune règle ici, seulement
 * de l'orchestration d'UI ; `game` reste l'autorité (mêmes actions que le futur
 * serveur).
 */
import {
  decideAction,
  Game,
  IllegalActionError,
  WINNING_SCORE,
  type BotDifficulty,
  type GameState,
  type TurnState,
} from '@ms/engine'

export type Mode = 'start' | 'playing' | 'turnEnd' | 'finished'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export function useGame() {
  let game: Game | null = null // autorité (état muté en place)
  const snapshot = shallowRef<GameState | null>(null) // copie pour l'affichage
  const sync = () => {
    snapshot.value = game ? (structuredClone(game.state) as GameState) : null
  }

  const mode = ref<Mode>('start')
  const difficulty = ref<BotDifficulty>('medium')
  const selected = ref<Set<number>>(new Set())
  const botThinking = ref(false)
  const turnActor = ref('')
  const transient = ref('')

  // Lectures réactives (sur l'instantané cloné).
  const turn = computed<TurnState | null>(() => snapshot.value?.turn ?? null)
  const players = computed(() => snapshot.value?.players ?? [])
  const currentIndex = computed(() => snapshot.value?.currentPlayerIndex ?? 0)
  const currentPlayer = computed(() => players.value[currentIndex.value] ?? null)
  const gamePhase = computed(() => snapshot.value?.phase ?? 'playing')
  const winner = computed(() => players.value.find(p => p.id === snapshot.value?.winnerId) ?? null)

  // ── Cycle de jeu ────────────────────────────────────────────────────────────

  function newGame(diff: BotDifficulty): void {
    difficulty.value = diff
    game = new Game([
      { id: 'you', name: 'Toi' },
      { id: 'bot', name: 'Le Corsaire', bot: true },
    ])
    startTurn()
  }

  function startTurn(): void {
    transient.value = ''
    selected.value = new Set()
    game!.startTurn()
    turnActor.value = game!.currentPlayer.name
    mode.value = 'playing'
    sync()
    if (game!.currentPlayer.bot) void runBot()
  }

  function afterAction(): void {
    selected.value = new Set()
    if (game!.state.turn!.phase === 'ended') mode.value = 'turnEnd'
    sync()
  }

  function human(fn: () => void): void {
    if (botThinking.value) return
    try {
      fn()
      transient.value = ''
      afterAction()
    } catch (err) {
      if (err instanceof IllegalActionError) {
        transient.value = err.message
        sync()
      } else throw err
    }
  }

  /** Dés sélectionnés relançables (hors têtes verrouillées et dés réservés). */
  function eligibleReroll(): number[] {
    const t = game?.state.turn
    if (!t) return []
    return [...selected.value].filter(id => {
      const d = t.dice[id]!
      return !d.locked && !d.banked
    })
  }

  function toggleDie(id: number): void {
    if (botThinking.value) return
    const t = game?.state.turn
    if (!t || t.phase !== 'decision') return
    const d = t.dice[id]!
    if (d.locked || d.face === null) return
    const s = new Set(selected.value)
    s.has(id) ? s.delete(id) : s.add(id)
    selected.value = s
  }

  const roll = () => human(() => game!.act({ type: 'roll' }))
  const reroll = () => human(() => game!.act({ type: 'reroll', diceIds: eligibleReroll() }))
  const stop = () => human(() => game!.act({ type: 'stop' }))
  const bank = () =>
    human(() =>
      game!.act({
        type: 'bank',
        diceIds: [...selected.value].filter(id => {
          const d = game!.state.turn!.dice[id]!
          return !d.banked && d.face !== 'skull'
        }),
      }),
    )
  const unbank = () =>
    human(() =>
      game!.act({ type: 'unbank', diceIds: [...selected.value].filter(id => game!.state.turn!.dice[id]!.banked) }),
    )

  function continueGame(): void {
    if (game!.state.phase === 'finished') {
      mode.value = 'finished'
      sync()
      return
    }
    startTurn()
  }

  async function runBot(): Promise<void> {
    botThinking.value = true
    await sleep(650)
    let guard = 0
    while (game!.state.turn && game!.state.turn.phase !== 'ended' && guard++ < 200) {
      const action = decideAction(game!.state.turn, { difficulty: difficulty.value })
      game!.act(action)
      sync()
      await sleep(750)
    }
    botThinking.value = false
    mode.value = 'turnEnd'
    sync()
  }

  return {
    WINNING_SCORE,
    mode,
    difficulty,
    selected,
    botThinking,
    turnActor,
    transient,
    turn,
    players,
    currentIndex,
    currentPlayer,
    gamePhase,
    winner,
    newGame,
    roll,
    reroll,
    stop,
    bank,
    unbank,
    toggleDie,
    continueGame,
    eligibleReroll,
  }
}
