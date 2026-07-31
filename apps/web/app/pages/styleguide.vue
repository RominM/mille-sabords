<script setup lang="ts">
interface Swatch {
  name: string
  hex: string
  on: string
  role: string
  note: string
  warn?: boolean
}

const palette: Swatch[] = [
  { name: 'Abîme', hex: '#2B1B12', on: '#EDE0C8', role: 'Fond global, ombres', note: 'base de la table' },
  { name: 'Chêne Vieilli', hex: '#4A3222', on: '#EDE0C8', role: 'Panneaux, surfaces', note: 'Parchemin dessus : 9.1:1 AAA' },
  { name: 'Doublon', hex: '#C9A227', on: '#2B1B12', role: 'Accent — actionnable / gagné', note: 'sur Abîme : 6.8:1 AA' },
  { name: 'Doublon clair', hex: '#E8C468', on: '#2B1B12', role: 'Hover / glow uniquement', note: 'jamais en fond' },
  { name: 'Cachet de Cire', hex: '#8C2F2F', on: '#EDE0C8', role: 'Danger — FOND', note: 'rouge sur sombre : 2.0:1 ✗', warn: true },
  { name: 'Eau de Cale', hex: '#2F6E68', on: '#EDE0C8', role: 'Succès — FOND', note: 'teal sur sombre : 2.8:1 ✗', warn: true },
  { name: 'Parchemin', hex: '#EDE0C8', on: '#2B1B12', role: 'Texte, cartes-info', note: 'sur Abîme : 12.7:1 AAA' },
]

const FACES = ['⚔️', '💀', '🐵', '🦜', '🪙', '💎']
const demoDice = ref([
  { face: 0, skull: false, locked: false, banked: false },
  { face: 4, skull: false, locked: false, banked: false },
  { face: 5, skull: false, locked: false, banked: true },
  { face: 1, skull: true, locked: true, banked: false },
])
function cycle(i: number) {
  const d = demoDice.value[i]!
  if (d.locked) return
  d.face = (d.face + 1) % FACES.length
  d.skull = d.face === 1
}

const hit = ref(true)
function replayShake() {
  hit.value = false
  requestAnimationFrame(() => (hit.value = true))
}
</script>

<template>
  <div class="sg">
    <header class="sg-header">
      <h1>Mille Sabords</h1>
      <p class="dim">
        Design system — bois vieilli, or, cachet de cire. L'or (Doublon) ne paraît que sur ce qui est actionnable ou
        gagné. <NuxtLink to="/">← retour au jeu</NuxtLink>
      </p>
    </header>

    <section class="sg-section">
      <h2>Palette</h2>
      <div class="sg-swatches">
        <div v-for="s in palette" :key="s.hex" class="sg-swatch">
          <div class="sg-swatch__chip" :style="{ background: s.hex, color: s.on }">{{ s.hex }}</div>
          <div class="sg-swatch__meta">
            <b>{{ s.name }}</b>{{ s.role }}
            <div :class="{ warn: s.warn }">{{ s.note }}</div>
          </div>
        </div>
      </div>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Typographie</h2>
      <div class="sg-stack">
        <div>
          <span class="tag">Display · Pirata One · 4rem</span>
          <div style="font-family: var(--font-display); font-size: var(--fs-display-xl); text-transform: uppercase; color: var(--accent); letter-spacing: 0.06em">
            Mille Sabords
          </div>
        </div>
        <div><span class="tag">Display · 2.5rem · nom de carte</span><div class="card-name">Bateau Pirate</div></div>
        <div>
          <span class="tag">Corps · Spectral · 1rem</span>
          <p style="max-width: 60ch">Réunis quatre sabres pour empocher la prime, ou arrête-toi avant la troisième tête de mort.</p>
        </div>
        <div>
          <span class="tag">Utilitaire · Cutive Mono</span>
          <div class="row"><span class="score">5&nbsp;400</span><span class="timer is-low">0:07</span></div>
        </div>
      </div>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Boutons & cachet de cire</h2>
      <div class="row">
        <button class="btn">Lancer les dés</button>
        <button class="btn btn--ghost">Voir les règles</button>
        <button class="btn" disabled>Indisponible</button>
        <WaxSeal label="Jouer" />
      </div>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Panneau à coins découpés</h2>
      <div class="row" style="align-items: stretch">
        <div class="panel" style="max-width: 280px">
          <div class="card-name" style="font-size: var(--fs-display-m)">Île au Trésor</div>
          <p class="dim" style="margin-top: var(--space-2)">Réserve des dés : ils restent acquis même si tu perds le tour.</p>
        </div>
        <div class="panel" style="max-width: 260px; display: flex; flex-direction: column; align-items: center; gap: var(--space-2); justify-content: center">
          <span class="tag">Score du capitaine</span><span class="score">6&nbsp;000</span>
        </div>
      </div>
    </section>

    <hr class="rope" />

    <section class="sg-section">
      <h2>Dés & état danger</h2>
      <div class="row">
        <button
          v-for="(d, i) in demoDice"
          :key="i"
          class="die is-clickable"
          :class="{ 'die--skull': d.skull, 'die--locked': d.locked, 'die--banked': d.banked }"
          :disabled="d.locked"
          @click="cycle(i)"
        >
          {{ FACES[d.face] }}
        </button>
      </div>
      <div class="row" style="margin-top: var(--space-4)">
        <span class="danger-badge" :class="{ 'is-hit': hit }">💀 3ᵉ tête de mort — tour perdu</span>
        <button class="btn btn--ghost" @click="replayShake">Rejouer la vibration</button>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.sg {
  max-width: 1040px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}
.dim {
  color: var(--text-dim);
}
.tag {
  font-family: var(--font-mono);
  font-size: var(--fs-body-s);
  color: var(--text-dim);
}
.warn {
  color: var(--danger-edge);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
}
.sg-header {
  text-align: center;
  margin-bottom: var(--space-5);
}
.sg-header h1 {
  color: var(--accent);
}
.sg-header p {
  max-width: 62ch;
  margin: var(--space-3) auto 0;
}
.sg-section {
  margin: var(--space-6) 0;
}
.sg-section > h2 {
  font-size: var(--fs-display-m);
  margin-bottom: var(--space-4);
}
.sg-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.sg-swatches {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: var(--space-3);
}
.sg-swatch {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: var(--shadow-1);
}
.sg-swatch__chip {
  height: 76px;
  display: flex;
  align-items: flex-end;
  padding: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--fs-body-s);
}
.sg-swatch__meta {
  background: var(--surface-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--fs-body-s);
  color: var(--text-dim);
}
.sg-swatch__meta b {
  display: block;
  font-family: var(--font-body);
  color: var(--text);
  margin-bottom: 2px;
}
</style>
