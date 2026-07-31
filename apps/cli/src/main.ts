/**
 * CLI de test Mille Sabords.
 *
 * Objectif : jouer une partie complète au clavier pour valider les règles
 * contre la boîte physique AVANT d'investir dans le front. Tous les sièges
 * sont pilotés par la personne au clavier (hotseat) — l'IA arrive en phase 2.
 *
 * Rigueur : ce CLI ne contient AUCUNE règle. Il ne fait qu'appeler `Game`
 * (qui délègue à `applyAction`) et afficher l'état renvoyé. Toute action
 * illégale remonte via `IllegalActionError` et est affichée telle quelle —
 * c'est précisément ce qui permet de vérifier le moteur à la main.
 *
 * Deux atouts pour la validation :
 *   • saisie manuelle des dés (mode « manuel ») → force n'importe quel scénario
 *   • graine RNG (mulberry32) → rejoue une partie à l'identique
 */
import { createInterface } from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'

import {
  applyAction,
  type BotDifficulty,
  DICE_COUNT,
  Game,
  IllegalActionError,
  mulberry32,
  playBotTurn,
  type DieFace,
  type RollFn,
  type TurnAction,
} from '@ms/engine'

import { faceKeyLegend, parseFace } from './faces.ts'
import {
  bold,
  dim,
  gold,
  green,
  red,
  renderDice,
  renderDiceStrip,
  renderOutcome,
  renderScoreboard,
  renderTurnHeader,
} from './render.ts'

/** Levée quand l'entrée est épuisée alors qu'une saisie était requise. */
class EndOfInput extends Error {}

/**
 * Lecteur de lignes maison. `readline/promises.question` ne délivre qu'une
 * seule réponse en entrée redirigée (pipe) sur ce runtime ; cette file d'attente
 * fonctionne aussi bien en terminal interactif qu'avec un script rejoué au pipe
 * (scénarios de validation reproductibles).
 */
const rl = createInterface({ input, crlfDelay: Infinity })
const pending: string[] = []
const waiters: ((line: string | null) => void)[] = []
let inputClosed = false
rl.on('line', line => {
  const w = waiters.shift()
  if (w) w(line)
  else pending.push(line)
})
rl.on('close', () => {
  inputClosed = true
  while (waiters.length) waiters.shift()!(null)
})

/** Affiche l'invite et lit une ligne. Renvoie null en fin d'entrée (EOF). */
function ask(prompt: string): Promise<string | null> {
  output.write(prompt)
  if (pending.length) return Promise.resolve(pending.shift()!)
  if (inputClosed) return Promise.resolve(null)
  return new Promise(res => waiters.push(res))
}

/** Variante exigeant une saisie : lève EndOfInput si l'entrée est épuisée. */
async function need(prompt: string): Promise<string> {
  const line = await ask(prompt)
  if (line === null) throw new EndOfInput()
  return line
}

interface Config {
  manualDice: boolean
  rng: () => number
  /** Difficulté des joueurs IA, indexée par id de joueur. */
  botDifficulty: Map<string, BotDifficulty>
}

// ─── Setup interactif ────────────────────────────────────────────────────────

async function askInt(q: string, def: number, min: number, max: number): Promise<number> {
  for (;;) {
    const line = await ask(`${q} ${dim(`[${def}]`)} : `)
    if (line === null) return def
    const raw = line.trim()
    if (raw === '') return def
    const n = Number(raw)
    if (Number.isInteger(n) && n >= min && n <= max) return n
    console.log(red(`  Entre un entier entre ${min} et ${max}.`))
  }
}

async function setup(): Promise<{ game: Game; config: Config }> {
  console.log(bold('\n🏴‍☠️  MILLE SABORDS — CLI de test des règles\n'))
  console.log(dim('Tous les joueurs sont pilotés au clavier (hotseat). Tape « help » en jeu.\n'))

  const count = await askInt('Nombre de joueurs (2-5)', 2, 2, 5)
  const players: { id: string; name: string; bot: boolean }[] = []
  const botDifficulty = new Map<string, BotDifficulty>()
  for (let i = 0; i < count; i++) {
    const def = `Joueur ${i + 1}`
    const name = (await ask(`Nom du joueur ${i + 1} ${dim(`[${def}]`)} : `))?.trim() || def
    const kind = (
      (await ask(`  Type — [h]umain, IA [1]facile [2]moyenne [3]difficile ${dim('[h]')} : `)) ?? ''
    ).trim()[0]
    const id = `p${i}`
    const diff: BotDifficulty | null =
      kind === '1' ? 'easy' : kind === '2' ? 'medium' : kind === '3' ? 'hard' : null
    players.push({ id, name, bot: diff !== null })
    if (diff) botDifficulty.set(id, diff)
  }

  const manualAns = (
    (await ask(`\nDés : [a]utomatique / [m]anuel (saisie à la main) ${dim('[a]')} : `)) ?? ''
  )
    .trim()
    .toLowerCase()
  const manualDice = manualAns.startsWith('m')

  const seedRaw = ((await ask(`Graine RNG (entier, vide = aléatoire) ${dim('[aléatoire]')} : `)) ?? '').trim()
  let rng: () => number
  if (seedRaw !== '' && Number.isInteger(Number(seedRaw))) {
    rng = mulberry32(Number(seedRaw))
    console.log(dim(`  Graine ${seedRaw} : partie reproductible.`))
  } else {
    rng = Math.random
  }

  const game = new Game(players, { rng })
  return { game, config: { manualDice, rng, botDifficulty } }
}

// ─── Lancers ─────────────────────────────────────────────────────────────────

/** Roller déterministe alimenté par des faces saisies à la main (mode manuel). */
function queuedRoller(faces: ReturnType<typeof parseFace>[]): RollFn {
  const queue = faces as Exclude<ReturnType<typeof parseFace>, null>[]
  let used = false
  return (count: number) => {
    if (used || count !== queue.length)
      throw new Error(`Roller manuel : attendu ${count} faces, reçu ${queue.length}`)
    used = true
    return queue
  }
}

/** Demande `count` faces valides au clavier, jusqu'à saisie correcte. */
async function promptFaces(count: number): Promise<RollFn> {
  console.log(dim(`  Faces attendues : ${faceKeyLegend()}`))
  for (;;) {
    const raw = await need(`  Entre les ${bold(String(count))} faces (ex: « s k m ») : `)
    const tokens = raw.trim().split(/\s+/).filter(Boolean)
    if (tokens.length !== count) {
      console.log(red(`  Il faut exactement ${count} faces (reçu ${tokens.length}).`))
      continue
    }
    const faces = tokens.map(parseFace)
    if (faces.some(f => f === null)) {
      console.log(red('  Lettre inconnue. Utilise : ' + faceKeyLegend()))
      continue
    }
    return queuedRoller(faces)
  }
}

/**
 * Effectue un lancer forcé (premier lancer ou lancer d'Île de la Tête-de-Mort).
 * Renvoie le roller à passer à `game.act` : undefined en auto (RNG interne),
 * ou un roller manuel alimenté au clavier.
 */
async function forcedRoll(game: Game, config: Config): Promise<RollFn | undefined> {
  const turn = game.state.turn!
  const count =
    turn.phase === 'first-roll'
      ? DICE_COUNT
      : turn.dice.filter(d => d.face !== 'skull').length
  const label = turn.phase === 'first-roll' ? `Premier lancer (${count} dés)` : `Île de la Tête-de-Mort — relance de ${count} dé(s)`
  console.log(bold(`\n▸ ${label}`))
  if (config.manualDice) return promptFaces(count)
  await ask(dim('  [Entrée] pour lancer…'))
  return undefined
}

// ─── Boucle d'un tour ────────────────────────────────────────────────────────

function showTable(game: Game): void {
  const turn = game.state.turn!
  console.log('\n' + renderDiceStrip(turn.dice))
  console.log(renderDice(turn.dice))
}

const HELP = [
  bold('\nCommandes (phase de décision) :'),
  '  reroll <id…>   (r)  relance les dés indiqués (min 2, au moins 1 réservé)',
  '  guard <tête> <id…> (g)  Gardienne : relance une tête de mort (une fois)',
  '  bank <id…>          Île au Trésor : réserve des dés',
  '  unbank <id…>        Île au Trésor : reprend des dés réservés',
  '  stop           (s)  s’arrête et compte les points',
  '  board               réaffiche les dés et les scores',
  '  timeout             simule le timeout de décision (0 point)',
  '  help           (?)  cette aide',
  '  quit                quitte la partie',
].join('\n')

function parseIds(tokens: string[]): number[] {
  return tokens.map(t => Number(t)).filter(n => Number.isInteger(n))
}

/**
 * Valide une action via le moteur SANS effet de bord ni consommation de saisie.
 * `applyAction` est pur (il clone l'état), donc on peut le rejouer avec un roller
 * neutre juste pour capter une IllegalActionError avant de demander les faces au
 * clavier (mode manuel). Les règles de sélection (min 2 dés, tête maudite, etc.)
 * ne dépendent pas des faces tirées : le roller factice n'influe pas sur elles.
 */
function assertLegal(game: Game, action: TurnAction): void {
  applyAction(game.state.turn!, action, (n: number) => Array<DieFace>(n).fill('sabre'))
}

/**
 * Applique une relance : valide d'abord la sélection (le moteur lève
 * IllegalActionError sans effet de bord), puis — en mode manuel — demande les
 * faces, et n'engage la partie qu'ensuite. On ne consomme donc jamais de saisie
 * de dés pour une sélection illégale.
 */
async function commitRoll(
  game: Game,
  config: Config,
  action: Extract<TurnAction, { type: 'reroll' }>,
): Promise<void> {
  assertLegal(game, action)
  const roller = config.manualDice ? await promptFaces(action.diceIds.length) : undefined
  game.act(action, roller)
  showTable(game)
}

/** Joue le tour du joueur courant jusqu'à sa fin. Renvoie false si l'on quitte. */
async function playTurn(game: Game, config: Config): Promise<boolean> {
  console.log(renderTurnHeader(game.currentPlayer.name, game.state.turn!))

  // Premier lancer (obligatoire)
  {
    const roller = await forcedRoll(game, config)
    game.act({ type: 'roll' }, roller)
    showTable(game)
  }

  for (;;) {
    const turn = game.state.turn!
    if (turn.phase === 'ended') break

    if (turn.phase === 'island-roll') {
      const roller = await forcedRoll(game, config)
      game.act({ type: 'roll' }, roller)
      showTable(game)
      continue
    }

    // phase === 'decision'
    const raw = await ask(`\n${gold('▶ ' + game.currentPlayer.name)} > `)
    if (raw === null) return false // fin d'entrée : on quitte proprement
    const line = raw.trim()
    const tokens = line.split(/\s+/).filter(Boolean)
    const cmd = (tokens[0] ?? '').toLowerCase()
    const rest = tokens.slice(1)

    try {
      switch (cmd) {
        case '':
          break
        case 'help':
        case 'h':
        case '?':
          console.log(HELP)
          break
        case 'board':
        case 'state':
          showTable(game)
          console.log('\n' + renderScoreboard(game.state))
          break
        case 'quit':
        case 'exit': {
          const ok = ((await ask('Quitter la partie ? [o/N] : ')) ?? 'o').trim().toLowerCase()
          if (ok.startsWith('o') || ok.startsWith('y')) return false
          break
        }
        case 'timeout':
          game.timeout()
          console.log(red('\n⏳ Timeout de décision : 0 point pour ce tour.'))
          break
        case 'stop':
        case 's': {
          game.act({ type: 'stop' })
          break
        }
        case 'bank':
        case 'unbank': {
          game.act({ type: cmd, diceIds: parseIds(rest) })
          showTable(game)
          break
        }
        case 'reroll':
        case 'r': {
          const diceIds = parseIds(rest)
          await commitRoll(game, config, { type: 'reroll', diceIds })
          break
        }
        case 'guard':
        case 'g': {
          const ids = parseIds(rest)
          const guardianDieId = ids[0]
          if (guardianDieId === undefined) {
            console.log(red('  Usage : guard <id de la tête> <autres id…>'))
            break
          }
          const diceIds = [...new Set(ids)]
          await commitRoll(game, config, { type: 'reroll', diceIds, guardianDieId })
          break
        }
        default:
          console.log(red(`  Commande inconnue : « ${cmd} ». Tape « help ».`))
      }
    } catch (err) {
      if (err instanceof IllegalActionError) console.log(red(`  ⛔ ${err.message}`))
      else throw err
    }
  }

  printTurnResult(game)
  return true
}

/** Affiche le résultat d'un tour terminé (score ou timeout). */
function printTurnResult(game: Game): void {
  const ended = game.state.turn!
  console.log('')
  if (ended.outcome) console.log(renderOutcome(ended.outcome))
  else console.log(dim('Tour terminé (timeout) : 0 point.'))
}

// ─── Tour d'une IA ───────────────────────────────────────────────────────────

function describeBotAction(action: TurnAction): string {
  switch (action.type) {
    case 'roll':
      return dim('  ▸ lance les dés')
    case 'reroll':
      return dim(`  ▸ relance les dés ${action.diceIds.join(', ')}`)
    case 'bank':
      return dim(`  ▸ réserve les dés ${action.diceIds.join(', ')}`)
    case 'unbank':
      return dim(`  ▸ reprend les dés ${action.diceIds.join(', ')}`)
    case 'stop':
      return dim('  ▸ s’arrête')
  }
}

/** Déroule le tour d'un joueur IA (dés automatiques), en narrant chaque coup. */
function runBotTurn(game: Game, config: Config): void {
  const player = game.currentPlayer
  const difficulty = config.botDifficulty.get(player.id) ?? 'medium'
  console.log(renderTurnHeader(player.name, game.state.turn!))
  console.log(dim(`  🤖 IA (${difficulty})`))
  playBotTurn(game, { difficulty }, (action) => {
    console.log(describeBotAction(action))
    if (action.type !== 'stop') showTable(game)
  })
  printTurnResult(game)
}

// ─── Boucle de partie ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { game, config } = await setup()

  while (game.state.phase === 'playing') {
    console.log('\n' + dim('─'.repeat(48)))
    console.log(renderScoreboard(game.state))
    game.startTurn()
    if (game.currentPlayer.bot) {
      runBotTurn(game, config)
    } else {
      const keepPlaying = await playTurn(game, config)
      if (!keepPlaying) {
        console.log(dim('\nPartie interrompue.'))
        break
      }
    }
  }

  if (game.state.phase === 'finished') {
    const winner = game.state.players.find(p => p.id === game.state.winnerId)!
    console.log(bold(green(`\n🏆 ${winner.name} remporte la partie avec ${winner.score} pts !`)))
    console.log('\n' + renderScoreboard(game.state))
  }

  rl.close()
}

main().catch(err => {
  if (err instanceof EndOfInput) {
    console.log(dim('\nFin de l’entrée — partie interrompue.'))
    rl.close()
    return
  }
  console.error(red('\nErreur inattendue :'), err)
  rl.close()
  process.exit(1)
})
