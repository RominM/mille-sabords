/**
 * Page style-guide du design system Mille Sabords.
 * Purement démonstrative : elle rend chaque token et composant pour validation
 * visuelle. Le vrai front (écrans de jeu) réutilisera `assets/scss/main.scss`.
 */
import './styleguide.scss'

interface Swatch {
  name: string
  hex: string
  on: string
  role: string
  note: string
  warn?: boolean
}

const PALETTE: Swatch[] = [
  { name: 'Abîme', hex: '#2B1B12', on: '#EDE0C8', role: 'Fond global, ombres', note: 'base de la table' },
  { name: 'Chêne Vieilli', hex: '#4A3222', on: '#EDE0C8', role: 'Panneaux, surfaces', note: 'Parchemin dessus : 9.1:1 AAA' },
  { name: 'Doublon', hex: '#C9A227', on: '#2B1B12', role: 'Accent — actionnable / gagné', note: 'sur Abîme : 6.8:1 AA' },
  { name: 'Doublon clair', hex: '#E8C468', on: '#2B1B12', role: 'Hover / glow uniquement', note: 'jamais en fond' },
  { name: 'Cachet de Cire', hex: '#8C2F2F', on: '#EDE0C8', role: 'Danger — FOND', note: 'texte rouge sur sombre : 2.0:1 ✗', warn: true },
  { name: 'Eau de Cale', hex: '#2F6E68', on: '#EDE0C8', role: 'Succès — FOND', note: 'teal sur sombre : 2.8:1 ✗', warn: true },
  { name: 'Parchemin', hex: '#EDE0C8', on: '#2B1B12', role: 'Texte, cartes-info', note: 'sur Abîme : 12.7:1 AAA' },
]

const FACES = ['⚔️', '💀', '🐵', '🦜', '🪙', '💎']

function swatchHTML(s: Swatch): string {
  return `
    <div class="sg-swatch">
      <div class="sg-swatch__chip" style="background:${s.hex};color:${s.on}">${s.hex}</div>
      <div class="sg-swatch__meta">
        <b>${s.name}</b>
        ${s.role}
        <div class="${s.warn ? 'sg-warn' : ''}" style="margin-top:4px">${s.note}</div>
      </div>
    </div>`
}

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="sg">
    <header class="sg-header">
      <h1>Mille Sabords</h1>
      <p>Design system — bois vieilli, or, cachet de cire. L'or (Doublon) ne
      paraît que sur ce qui est actionnable ou gagné ; tout le reste est chêne,
      parchemin et pénombre.</p>
    </header>

    <section class="sg-section">
      <h2>Palette</h2>
      <div class="sg-swatches">${PALETTE.map(swatchHTML).join('')}</div>
      <p class="sg-note">Contrastes WCAG calculés. <span class="sg-warn">Rouge et
      teal échouent en texte sur fond sombre</span> → ils servent de fonds, avec
      texte Parchemin par-dessus.</p>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Typographie</h2>
      <div class="sg-stack">
        <div><span class="sg-tag">Display · Pirata One · 4rem</span>
          <div class="sg-type-sample" style="font-family:var(--font-display);font-size:var(--fs-display-xl);text-transform:uppercase;color:var(--accent);letter-spacing:.06em">Mille Sabords</div></div>
        <div><span class="sg-tag">Display · 2.5rem · nom de carte</span>
          <div class="card-name">Bateau Pirate</div></div>
        <div><span class="sg-tag">Corps · Spectral · 1rem</span>
          <p style="max-width:60ch">Réunis quatre sabres pour empocher la prime, ou
          arrête-toi avant la troisième tête de mort. Le capitaine tient son livre de bord.</p></div>
        <div><span class="sg-tag">Utilitaire · Cutive Mono · score & timer</span>
          <div class="sg-row"><span class="score">5&nbsp;400</span><span class="timer is-low">0:07</span></div></div>
      </div>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Boutons & cachet de cire</h2>
      <div class="sg-row">
        <button class="btn">Lancer les dés</button>
        <button class="btn btn--ghost">Voir les règles</button>
        <button class="btn" disabled>Indisponible</button>
        <button class="seal">Lancer</button>
      </div>
      <p class="sg-note">Le cachet de cire est le bouton d'action principal —
      reconnaissable en une capture. Focus clavier : anneau Doublon décalé
      (essaie <kbd>Tab</kbd>).</p>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Panneau à coins découpés</h2>
      <div class="sg-row" style="align-items:stretch">
        <div class="panel" style="max-width:280px">
          <div class="card-name" style="font-size:var(--fs-display-m)">Île au Trésor</div>
          <p class="text-dim" style="margin-top:var(--space-2)">Réserve des dés : ils
          restent acquis même si tu perds le tour.</p>
        </div>
        <div class="panel" style="max-width:280px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:var(--space-2)">
          <span class="sg-tag">Score du capitaine</span>
          <span class="score">6&nbsp;000</span>
        </div>
      </div>
      <p class="sg-note">Bordure dorée obtenue via un ::before clippé (le
      <code>clip-path</code> découperait un <code>border</code> classique).</p>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Dés & état danger</h2>
      <div class="sg-row" id="dice"></div>
      <div class="sg-row" style="margin-top:var(--space-4)">
        <span class="danger-badge" id="danger">💀 3ᵉ tête de mort — tour perdu</span>
        <button class="btn btn--ghost" id="danger-trigger">Rejouer la vibration</button>
      </div>
      <p class="sg-note">Clique un dé pour le faire tourner. La tête de mort passe
      en rouge ; un dé verrouillé (rouge) / réservé (teal) porte un liseré.
      <code>prefers-reduced-motion</code> coupe vibration et rotation.</p>
    </section>
  </div>`

// ── Dés interactifs ──────────────────────────────────────────────────────────
const dice = document.querySelector<HTMLDivElement>('#dice')!
const demoDice = [
  { face: 0, cls: '' },
  { face: 4, cls: '' },
  { face: 5, cls: 'die--banked' },
  { face: 1, cls: 'die--skull die--locked' },
]
for (const d of demoDice) {
  const el = document.createElement('button')
  el.className = `die ${d.cls}`.trim()
  el.textContent = FACES[d.face]!
  let f = d.face
  el.addEventListener('click', () => {
    el.style.transform = 'rotate(-8deg) scale(1.06)'
    setTimeout(() => (el.style.transform = ''), 130)
    if (!el.classList.contains('die--locked')) {
      f = (f + 1) % FACES.length
      el.textContent = FACES[f]!
      el.classList.toggle('die--skull', f === 1)
    }
  })
  dice.appendChild(el)
}

// ── Rejouer la micro-vibration danger ────────────────────────────────────────
const danger = document.querySelector<HTMLElement>('#danger')!
document.querySelector('#danger-trigger')!.addEventListener('click', () => {
  danger.classList.remove('is-hit')
  void danger.offsetWidth // force le reflow pour relancer l'animation
  danger.classList.add('is-hit')
})
danger.classList.add('is-hit')
