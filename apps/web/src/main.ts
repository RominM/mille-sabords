/**
 * Écran de jeu Mille Sabords — solo contre l'IA.
 * Le moteur (@ms/engine) tient TOUTE la logique : cet écran ne fait que rendre
 * `game.state` et renvoyer des actions. Même autorité que la future version
 * multijoueur — aucune règle ici.
 */
import './game.scss'
import {
  decideAction,
  Game,
  IllegalActionError,
  WINNING_SCORE,
  type BotDifficulty,
  type Die,
  type DieFace,
  type PirateCard,
  type TurnOutcome,
} from '@ms/engine'

const FACE: Record<DieFace, string> = {
  sabre: '⚔️',
  skull: '💀',
  monkey: '🐵',
  parrot: '🦜',
  coin: '🪙',
  diamond: '💎',
}

// ─── État de l'UI ─────────────────────────────────────────────────────────────

type Mode = 'start' | 'playing' | 'turnEnd' | 'finished'

let game: Game
let difficulty: BotDifficulty = 'medium'
let pendingDifficulty: BotDifficulty = 'medium'
let mode: Mode = 'start'
let selected = new Set<number>()
let botThinking = false
let turnActor = ''
let transient = '' // message éphémère (action illégale)

const app = document.querySelector<HTMLDivElement>('#app')!
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── Présentation des cartes (copie UI, pas de règle) ────────────────────────

function cardInfo(card: PirateCard): { name: string; effect: string } {
  switch (card.type) {
    case 'treasure-island':
      return { name: 'Île au Trésor', effect: 'Réserve des dés : ils restent acquis même en cas de 3ᵉ tête.' }
    case 'pirate':
      return { name: 'Pirate', effect: 'Points du tour doublés. Malus de l’Île doublé.' }
    case 'skulls':
      return { name: `Tête de Mort ×${card.count}`, effect: `${card.count} tête(s) de mort offerte(s) au départ.` }
    case 'guardian':
      return { name: 'Gardienne', effect: 'Une tête de mort relançable, une seule fois (bientôt dans l’UI).' }
    case 'ship':
      return { name: `Bateau Pirate — ${card.sabres} sabres`, effect: `Réunis ${card.sabres} sabres → +${card.value}, sinon −${card.value}. Jamais d’Île.` }
    case 'coin':
      return { name: "Pièce d'or", effect: 'Une pièce virtuelle en plus (+100).' }
    case 'diamond':
      return { name: 'Diamant', effect: 'Un diamant virtuel en plus (+100).' }
    case 'animals':
      return { name: 'Animaux', effect: 'Singes et perroquets comptent comme un même symbole.' }
  }
}

// ─── Cycle de jeu ─────────────────────────────────────────────────────────────

function newGame(diff: BotDifficulty): void {
  difficulty = diff
  game = new Game([
    { id: 'you', name: 'Toi' },
    { id: 'bot', name: 'Le Corsaire', bot: true },
  ])
  startCurrentTurn()
}

function startCurrentTurn(): void {
  transient = ''
  selected.clear()
  game.startTurn()
  turnActor = game.currentPlayer.name
  mode = 'playing'
  render()
  if (game.currentPlayer.bot) void runBot()
}

function afterAction(): void {
  selected.clear()
  if (game.state.turn!.phase === 'ended') {
    mode = 'turnEnd'
  }
  render()
}

function continueGame(): void {
  if (game.state.phase === 'finished') {
    mode = 'finished'
    render()
    return
  }
  startCurrentTurn()
}

async function runBot(): Promise<void> {
  botThinking = true
  await sleep(650)
  let guard = 0
  while (game.state.turn && game.state.turn.phase !== 'ended' && guard++ < 200) {
    const action = decideAction(game.state.turn, { difficulty })
    game.act(action)
    render()
    await sleep(750)
  }
  botThinking = false
  mode = 'turnEnd'
  render()
}

// ─── Actions du joueur humain ────────────────────────────────────────────────

function human(fn: () => void): void {
  if (botThinking) return
  try {
    fn()
    transient = ''
    afterAction()
  } catch (err) {
    if (err instanceof IllegalActionError) {
      transient = err.message
      render()
    } else throw err
  }
}

function eligibleReroll(): number[] {
  return [...selected].filter(id => {
    const d = game.state.turn!.dice[id]!
    return !d.locked && !d.banked
  })
}

function toggleDie(id: number): void {
  if (botThinking) return
  const turn = game.state.turn!
  if (turn.phase !== 'decision') return
  const d = turn.dice[id]!
  if (d.locked || d.face === null) return
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
  render()
}

// ─── Rendu ────────────────────────────────────────────────────────────────────

function dieHTML(d: Die, clickable: boolean): string {
  const cls = ['die']
  if (d.face === 'skull') cls.push('die--skull')
  if (d.locked) cls.push('die--locked')
  if (d.banked) cls.push('die--banked')
  if (selected.has(d.id)) cls.push('is-selected')
  if (clickable && !d.locked && d.face !== null) cls.push('is-clickable')
  const glyph = d.face ? FACE[d.face] : '·'
  return `<button class="${cls.join(' ')}" data-die="${d.id}" ${d.locked ? 'disabled' : ''}>${glyph}</button>`
}

function scoreboardHTML(): string {
  return `<div class="scoreboard">${game.state.players
    .map((p, i) => {
      const cur = i === game.state.currentPlayerIndex && game.state.phase === 'playing'
      return `<div class="panel pscore ${cur ? 'pscore--current' : ''}">
        <span class="pscore__name">${cur ? '▸ ' : ''}${p.name}${p.bot ? ' <span class="pscore__badge">IA</span>' : ''}</span>
        <span class="score">${p.score}</span>
      </div>`
    })
    .join('')}</div>`
}

function actionbarHTML(): string {
  const turn = game.state.turn!
  if (turn.phase === 'ended') return `<div class="actionbar"></div>`
  if (game.currentPlayer.bot) {
    return `<div class="actionbar"><span class="bot-banner">Le Corsaire réfléchit…</span></div>`
  }
  if (turn.phase === 'first-roll') {
    return `<div class="actionbar">
      <button class="seal" id="roll">Lancer</button>
      <p class="hint">Lance les 8 dés Corsaires.</p>
    </div>`
  }
  if (turn.phase === 'island-roll') {
    return `<div class="actionbar">
      <button class="seal" id="roll">Lancer</button>
      <p class="hint">Île de la Tête-de-Mort : relance forcée tant que des têtes sortent.</p>
    </div>`
  }
  // decision
  const n = eligibleReroll().length
  const isTreasure = turn.card.type === 'treasure-island'
  const bankable = [...selected].filter(id => {
    const d = turn.dice[id]!
    return !d.banked && d.face !== 'skull'
  }).length
  const unbankable = [...selected].filter(id => turn.dice[id]!.banked).length
  const treasureBtns = isTreasure
    ? `<button class="btn btn--ghost" id="bank" ${bankable ? '' : 'disabled'}>Réserver (${bankable})</button>
       <button class="btn btn--ghost" id="unbank" ${unbankable ? '' : 'disabled'}>Reprendre (${unbankable})</button>`
    : ''
  return `<div class="actionbar">
    <button class="btn" id="reroll" ${n >= 2 ? '' : 'disabled'}>Relancer (${n})</button>
    ${treasureBtns}
    <button class="btn btn--ghost" id="stop">S’arrêter</button>
    <p class="hint">${transient ? `<span class="card-skulls">⛔ ${transient}</span>` : 'Sélectionne des dés à relancer (min 2, garde-en au moins un), ou arrête-toi.'}</p>
  </div>`
}

function boardHTML(): string {
  const turn = game.state.turn!
  const info = cardInfo(turn.card)
  const skulls = turn.dice.filter(d => d.face === 'skull').length + (turn.card.type === 'skulls' ? turn.card.count : 0)
  const clickable = !game.currentPlayer.bot && turn.phase === 'decision'
  return `
    <div class="board">
      <div class="topbar">
        <h1>Mille Sabords</h1>
        <a href="/styleguide.html">design system ↗</a>
      </div>
      ${scoreboardHTML()}
      <div class="stage">
        <div class="card-zone">
          <div class="card-name">${info.name}</div>
          <p class="card-effect">${info.effect}</p>
          ${skulls > 0 ? `<p class="card-skulls">${skulls} tête${skulls > 1 ? 's' : ''} de mort</p>` : ''}
        </div>
        <div class="dice-grid">${turn.dice.map(d => dieHTML(d, clickable)).join('')}</div>
      </div>
      ${actionbarHTML()}
    </div>`
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

function outcomeHTML(outcome: TurnOutcome): string {
  const lines: string[] = []
  let title = ''
  if (outcome.reason === 'stopped') {
    title = 'Tour terminé'
    const b = outcome.breakdown!
    for (const c of b.combos)
      lines.push(`${c.count}× ${c.face === 'animals' ? 'Animaux' : FACE[c.face]} → +${c.points}`)
    if (b.treasures) lines.push(`Trésors → +${b.treasures}`)
    if (b.fullChest) lines.push('Coffre plein → +500')
    if (b.shipResult === 'success') lines.push('Bateau réussi ✅')
    if (b.shipResult === 'failed') lines.push('Bateau raté ❌')
    if (b.doubled) lines.push('Carte Pirate ×2')
  } else if (outcome.reason === 'three-skulls') {
    title = '💀 Trois têtes — tour perdu'
  } else {
    title = '☠ Île de la Tête-de-Mort'
    lines.push(`Chaque adversaire perd ${outcome.opponentPenalty} pts`)
  }
  const scoreCls = outcome.score < 0 ? 'neg' : outcome.score > 0 ? 'pos' : ''
  return `<h2>${title}</h2>
    <div class="outcome-lines">
      ${lines.map(l => `<span>${l}</span>`).join('')}
      <span class="${scoreCls}"><strong>${turnActor} : ${outcome.score >= 0 ? '+' : ''}${outcome.score} pts</strong></span>
    </div>`
}

function overlayHTML(): string {
  if (mode === 'start') {
    const btn = (d: BotDifficulty, label: string) =>
      `<button class="btn diff ${d === pendingDifficulty ? 'is-active' : ''}" data-diff="${d}">${label}</button>`
    return `<div class="overlay"><div class="panel">
      <h2>Mille Sabords</h2>
      <p class="card-effect">Affronte Le Corsaire (l’IA) en solo. Premier à ${WINNING_SCORE} points.</p>
      <div class="diff-choices">${btn('easy', 'Facile')}${btn('medium', 'Moyen')}${btn('hard', 'Difficile')}</div>
      <button class="seal" id="start">Jouer</button>
    </div></div>`
  }
  if (mode === 'turnEnd') {
    const outcome = game.state.turn!.outcome
    const body = outcome ? outcomeHTML(outcome) : `<h2>Tour terminé</h2>`
    const next = game.state.phase === 'finished' ? 'Voir le résultat' : 'Continuer'
    return `<div class="overlay"><div class="panel">${body}
      <button class="btn" id="continue">${next}</button>
    </div></div>`
  }
  if (mode === 'finished') {
    const winner = game.state.players.find(p => p.id === game.state.winnerId)!
    return `<div class="overlay"><div class="panel">
      <h2>🏆 ${winner.name} l’emporte !</h2>
      <div class="outcome-lines">${game.state.players.map(p => `<span>${p.name} : ${p.score} pts</span>`).join('')}</div>
      <button class="seal" id="replay">Rejouer</button>
    </div></div>`
  }
  return ''
}

function render(): void {
  const board = mode === 'start' ? '' : boardHTML()
  app.innerHTML = board + overlayHTML()
  attach()
}

// ─── Câblage des événements ──────────────────────────────────────────────────

function attach(): void {
  const on = (sel: string, fn: () => void) => document.getElementById(sel)?.addEventListener('click', fn)

  // Overlays
  document.querySelectorAll<HTMLButtonElement>('.diff').forEach(b =>
    b.addEventListener('click', () => {
      pendingDifficulty = b.dataset.diff as BotDifficulty
      render()
    }),
  )
  on('start', () => newGame(pendingDifficulty))
  on('continue', continueGame)
  on('replay', () => {
    pendingDifficulty = difficulty
    mode = 'start'
    render()
  })

  if (mode !== 'playing') return

  // Dés
  document.querySelectorAll<HTMLButtonElement>('[data-die]').forEach(b =>
    b.addEventListener('click', () => toggleDie(Number(b.dataset.die))),
  )

  // Actions
  on('roll', () => human(() => game.act({ type: 'roll' })))
  on('reroll', () => human(() => game.act({ type: 'reroll', diceIds: eligibleReroll() })))
  on('stop', () => human(() => game.act({ type: 'stop' })))
  on('bank', () =>
    human(() =>
      game.act({
        type: 'bank',
        diceIds: [...selected].filter(id => !game.state.turn!.dice[id]!.banked && game.state.turn!.dice[id]!.face !== 'skull'),
      }),
    ),
  )
  on('unbank', () =>
    human(() => game.act({ type: 'unbank', diceIds: [...selected].filter(id => game.state.turn!.dice[id]!.banked) })),
  )
}

render()
