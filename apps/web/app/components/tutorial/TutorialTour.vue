<template>
  <div class="tour">
    <div v-if="hole" class="tour__hole" :style="holeStyle" />
    <div v-else class="tour__veil" />

    <aside ref="cardEl" class="tour__card" :style="cardStyle">
      <p class="tour__count mono">{{ index + 1 }} / {{ STEPS.length }}</p>
      <h2 class="tour__title">{{ step.title }}</h2>
      <p class="tour__text">{{ step.text }}</p>

      <p v-if="held" class="tour__held">{{ step.hold }}</p>

      <div class="tour__actions">
        <button
          v-click-sound
          v-hover-sound
          class="btn btn--ghost tour__btn"
          type="button"
          :disabled="index === 0"
          @click="previous"
        >
          Précédent
        </button>

        <button
          v-click-sound
          v-hover-sound
          class="btn tour__btn"
          type="button"
          :disabled="held"
          @click="next"
        >
          {{ last ? 'À l’abordage !' : 'Suivant' }}
        </button>
      </div>

      <button v-click-sound v-hover-sound class="tour__skip" type="button" @click="emit('close')">
        Passer le tutoriel
      </button>
    </aside>
  </div>
</template>

<script setup lang="ts">
/**
 * Visite guidée du plateau, sur le premier tour d'une partie solo.
 *
 * Elle n'apprend PAS les règles — c'est l'affaire du barème et des règles :
 * elle montre où sont les choses et ce qu'on en fait. D'où une visite qui
 * éclaire des zones du décor plutôt qu'un texte de plus à lire.
 *
 * Le composant ne joue à rien et ne touche à aucune règle : il éclaire, il
 * raconte, et il ATTEND. La seule chose qu'il demande au plateau est le
 * premier lancer — le geste qu'aucune explication ne remplace.
 *
 * Les zones sont désignées par leur classe CSS : un renommage de classe ne se
 * verrait à aucun typecheck, d'où le repli silencieux (voile sans trou) plutôt
 * qu'un écran cassé.
 */
type Side = 'top' | 'bottom' | 'left' | 'right'

interface Step {
  /** Zones à éclairer, réunies en un seul trou. Vide = pas de trou. */
  targets: string[]
  title: string
  text: string
  /** Tiroir à ouvrir pour que la zone soit visible. */
  panel?: string
  /** Geste attendu du joueur avant de pouvoir avancer. */
  hold?: string
  /**
   * Côté imposé au parchemin. Sans lui, il se pose là où il reste le plus de
   * place — ce qui ne tient pas compte de ce qu'il ne DOIT pas cacher.
   */
  side?: Side
}

const props = defineProps({
  /** Durée d'une décision, en secondes — dite telle qu'elle est réglée. */
  seconds: { type: Number, required: true },
  /** Vrai dès que la première volée est retombée : c'est ce qu'on attend. */
  rolled: { type: Boolean, default: false }
})

const emit = defineEmits<{ close: [] }>()

const panels = useSidePanels()

const STEPS: Step[] = [
  {
    targets: [],
    title: 'Bienvenue à bord',
    text: 'Le Corsaire t’attend en face. Avant le premier lancer, faisons le tour de la table : à quoi sert chaque chose, et ce que tu en fais. Le temps est suspendu — reviens en arrière ou passe la visite quand tu veux.'
  },
  {
    targets: ['.turnbar'],
    title: 'Le sablier',
    text: `Il ne borne pas ton tour mais chaque décision : ${props.seconds} secondes pour choisir quels dés garder, puis il repart à zéro. Il ne tourne pas tant que la visite dure.`
  },
  {
    targets: ['.pcard__img'],
    title: 'La carte du tour',
    text: 'Tirée avant ton premier lancer, elle pèse sur tout le reste : elle peut multiplier tes points, t’imposer un défi à tenir, ou te coller une tête de mort d’avance. Passe la souris sur la carte pour voir les capacités de celle-ci.'
  },
  {
    targets: ['.side--bareme'],
    title: 'Le barème',
    text: 'Ce que rapporte chaque combinaison. C’est lui qui dit si garder trois sabres vaut mieux que garder deux pièces — garde-le sous la main, le tiroir s’ouvre à tout moment.',
    panel: 'bareme'
  },
  {
    targets: ['.board-seals__roll'],
    title: 'Lancer les dés',
    text: 'Le cachet de cire jette les huit dés sur la table. À toi de jouer : rien ne remplace le premier lancer.',
    hold: '⚓ Lance les dés pour continuer.'
  },
  {
    targets: ['.board-dice', '.board-slots'],
    title: 'Garder, ou relancer',
    text: 'Clique un dé pour le garder, ou glisse-le dans le cadre de ton choix. Les dés gardés comptent ; les autres repartent au lancer suivant.',
    // À gauche, sans discussion : c'est l'instant du choix, et la carte du tour
    // — posée à droite — est ce qui le décide. La cacher ici serait absurde.
    side: 'left'
  },
  {
    targets: ['.board-seals__stop'],
    title: 'S’arrêter',
    text: 'Relance tant que tu veux — il te faut au moins deux dés à relancer — mais trois têtes de mort et le tour ne rapporte rien. S’arrêter, c’est encaisser ce qui est sur la table.'
  },
  {
    targets: ['.side--historique'],
    title: 'L’historique',
    text: 'Tour par tour, le détail des points marqués — les tiens comme ceux du Corsaire. De quoi comprendre après coup ce qu’un choix a coûté.',
    panel: 'historique'
  }
]

/** Marge autour de la zone éclairée, et entre le trou et le parchemin. */
const PADDING = 10
const GAP = 16
/** Largeur de confort du parchemin — il se resserre si la bande est étroite. */
const MAX_WIDTH = 360

const cardEl = ref<HTMLElement | null>(null)
const index = ref(0)
const hole = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const cardSize = ref({ w: 384, h: 260 })
const viewport = ref({ w: 0, h: 0 })

let settleTimers: ReturnType<typeof setTimeout>[] = []

const step = computed(() => STEPS[index.value]!)
const last = computed(() => index.value === STEPS.length - 1)
/** Le pas attend un geste qui n'est pas encore venu. */
const held = computed(() => !!step.value.hold && !props.rolled)

const holeStyle = computed(() => {
  const box = hole.value
  if (!box) return {}
  return {
    left: `${box.x - PADDING}px`,
    top: `${box.y - PADDING}px`,
    width: `${box.w + PADDING * 2}px`,
    height: `${box.h + PADDING * 2}px`
  }
})

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), Math.max(low, high))

/**
 * Le parchemin se pose CONTRE sa zone, du côté où il tient — et le pas peut
 * imposer ce côté quand il y a quelque chose à ne pas cacher. Sa largeur se
 * réduit à la bande libre plutôt que de déborder sur la zone qu'il commente.
 *
 * Le centrer dans la bande, comme avant, l'éloignait de ce qu'il désigne : on
 * lisait un texte sans savoir de quoi il parlait.
 */
const cardStyle = computed(() => {
  const box = hole.value
  const { w, h } = viewport.value
  // Sans zone à éclairer — l'accueil de la visite — le parchemin tient le
  // centre de l'écran : il ne montre rien, il se présente.
  if (!box || !w) {
    return { left: '50%', top: '50%', width: `${MAX_WIDTH}px`, translate: '-50% -50%' }
  }

  const band: Record<Side, number> = {
    top: box.y - PADDING,
    bottom: h - (box.y + box.h + PADDING),
    left: box.x - PADDING,
    right: w - (box.x + box.w + PADDING)
  }

  const cardH = cardSize.value.h
  const order: Side[] = step.value.side
    ? [step.value.side]
    : (['bottom', 'top', 'right', 'left'] as Side[]).sort((a, b) => band[b] - band[a])

  const fits = (side: Side): boolean =>
    band[side] >= (side === 'top' || side === 'bottom' ? cardH : 240) + GAP
  const side = order.find(fits) ?? order[0]!

  const width =
    side === 'left' || side === 'right'
      ? clamp(band[side] - GAP * 2, 200, MAX_WIDTH)
      : Math.min(MAX_WIDTH, w - GAP * 2)

  const horizontal = side === 'left' || side === 'right'
  const centre = horizontal
    ? side === 'left'
      ? box.x - PADDING - GAP - width / 2
      : box.x + box.w + PADDING + GAP + width / 2
    : box.x + box.w / 2
  const top = horizontal
    ? box.y + box.h / 2 - cardH / 2
    : side === 'top'
      ? box.y - PADDING - GAP - cardH
      : box.y + box.h + PADDING + GAP

  return {
    left: `${clamp(centre, width / 2 + GAP, w - width / 2 - GAP)}px`,
    top: `${clamp(top, GAP, h - cardH - GAP)}px`,
    width: `${width}px`,
    translate: '-50% 0'
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', measure)
  reveal()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', measure)
  clearSettle()
  // Le tiroir se referme APRÈS le démontage : `openPanel` est un état partagé,
  // et le toucher pendant que Vue démonte cet arbre-ci ferait rendre le tiroir
  // au milieu d'un démontage — la pire fenêtre pour bouger un `Teleport`.
  void nextTick(() => panels.open(null))
})

function clearSettle(): void {
  settleTimers.forEach(clearTimeout)
  settleTimers = []
}

/**
 * Ouvre ce que le pas demande, puis mesure — plusieurs fois. Un tiroir GLISSE :
 * mesuré à l'instant du clic, il donnerait sa position de départ, et le trou
 * éclairerait le vide le temps de l'animation.
 */
function reveal(): void {
  clearSettle()
  panels.open(step.value.panel ?? null)
  void nextTick(measure)
  settleTimers = [60, 180, 380, 620].map((delay) => setTimeout(measure, delay))
}

function measure(): void {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
  const card = cardEl.value?.getBoundingClientRect()
  if (card) cardSize.value = { w: card.width, h: card.height }

  const boxes = step.value.targets
    .map((selector) => document.querySelector(selector)?.getBoundingClientRect())
    .filter((box): box is DOMRect => !!box && box.width > 0 && box.height > 0)

  if (!boxes.length) {
    hole.value = null
    return
  }

  const x = Math.min(...boxes.map((box) => box.left))
  const y = Math.min(...boxes.map((box) => box.top))
  hole.value = {
    x,
    y,
    w: Math.max(...boxes.map((box) => box.right)) - x,
    h: Math.max(...boxes.map((box) => box.bottom)) - y
  }
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close')
}

function next(): void {
  if (held.value) return
  if (last.value) return emit('close')
  index.value++
}

function previous(): void {
  if (index.value > 0) index.value--
}

watch(index, reveal)

// Le lancer accompli, la visite enchaîne d'elle-même : le joueur vient de
// faire le geste, l'écran doit le suivre sans lui redemander un clic.
watch(
  () => props.rolled,
  (done) => {
    if (done && step.value.hold) next()
  }
)
</script>

<style scoped lang="scss">
$veil: rgba(24, 14, 8, 0.78);

.tour {
  position: fixed;
  inset: 0;
  z-index: 900;
  // La visite montre le plateau : elle ne doit pas s'interposer entre le
  // joueur et lui. Seul le parchemin reprend le pointeur.
  pointer-events: none;

  &__veil {
    position: absolute;
    inset: 0;
    background: $veil;
  }

  // Le « trou » n'est pas un trou : c'est une ombre portée démesurée qui
  // assombrit tout ce qui l'entoure. Une découpe réelle demanderait un masque
  // sur un calque plein écran, plus coûteux et plus fragile.
  &__hole {
    position: absolute;
    border-radius: var(--radius-btn);
    box-shadow:
      0 0 0 100vmax $veil,
      inset 0 0 0 2px rgba(201, 162, 39, 0.85);
    transition:
      left 0.25s ease,
      top 0.25s ease,
      width 0.25s ease,
      height 0.25s ease;
  }

  // La largeur vient du placement : elle se réduit à la bande libre.
  &__card {
    position: absolute;
    max-width: calc(100vw - var(--space-5));
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-btn);
    background: var(--color-abyss-900);
    box-shadow: var(--shadow-2);
    pointer-events: auto;
  }

  &__count {
    color: var(--accent);
    font-size: var(--fs-body-s);
    letter-spacing: 0.12em;
  }

  &__title {
    color: var(--accent);
    font-family: var(--font-display);
    font-size: 1.9rem;
    line-height: 1;
  }

  &__text {
    color: var(--text);
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: 1.45;
  }

  &__held {
    color: var(--accent-hi);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  &__btn {
    flex: 1;
    justify-content: center;
    font-size: var(--fs-body-s);
  }

  &__skip {
    align-self: center;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-dim);
    font-family: var(--font-body);
    font-size: var(--fs-body-s);
    text-decoration: underline;

    &:hover {
      color: var(--accent);
    }
  }
}
</style>
