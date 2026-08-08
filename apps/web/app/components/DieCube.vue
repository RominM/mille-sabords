<template>
  <div
    class="die-cube"
    :class="{ 'die-cube--void': face === null, 'die-cube--seated': seated }"
    role="img"
    :aria-label="face ?? 'dé'"
    :style="styleVars"
  >
    <span ref="groundEl" class="die-cube__ground" aria-hidden="true" />

    <div ref="hopEl" class="die-cube__throw">
      <div class="die-cube__scene">
        <div ref="cubeEl" class="die-cube__cube">
          <span
            v-for="slot in SLOTS"
            :key="slot.name"
            class="die-cube__face"
            :class="`die-cube__face--${slot.name}`"
          >
            <img :src="FACE_ART[slot.face]" alt="" class="die-cube__art" />
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Dé en cube 3D CSS qui « tombe » sur une face IMPOSÉE.
 *
 * Le résultat est décidé avant l'animation — par le moteur en solo, par le
 * serveur en multi. L'animation est donc du théâtre : elle doit atterrir sur la
 * face demandée, jamais en décider. C'est pourquoi l'orientation finale est
 * CALCULÉE, et non subie comme le ferait un moteur physique.
 *
 * Le composant ne lance rien tout seul : il rejoue à chaque incrément de
 * `roll`. Un compteur plutôt qu'un watch sur `face`, parce qu'un dé peut
 * retomber sur la même face deux fois de suite — et doit quand même rouler.
 */
import type { DieFace } from '@rf/engine'
import sabre from '~/assets/images/dice/die-face_sabre.webp'
import skull from '~/assets/images/dice/die-face_skull.webp'
import monkey from '~/assets/images/dice/die-face_monkey.webp'
import parrot from '~/assets/images/dice/die-face_parot.webp'
import coin from '~/assets/images/dice/die-fice_coin.webp'
import diamond from '~/assets/images/dice/die-face_diamond.webp'
import diceRoll from '~/assets/sounds/dice-roll-sound.mp3'

const FACE_ART: Record<DieFace, string> = { sabre, skull, monkey, parrot, coin, diamond }

/**
 * Les six faces du cube, et la rotation qui ramène chacune vers la caméra.
 * `land` est exactement l'INVERSE de la transformation qui pose la face en CSS
 * (`.die-cube__face--*`) : les deux listes doivent rester cohérentes.
 */
const SLOTS = [
  { name: 'front', face: 'sabre', land: { x: 0, y: 0 } },
  { name: 'back', face: 'skull', land: { x: 0, y: 180 } },
  { name: 'right', face: 'monkey', land: { x: 0, y: -90 } },
  { name: 'left', face: 'parrot', land: { x: 0, y: 90 } },
  { name: 'top', face: 'coin', land: { x: -90, y: 0 } },
  { name: 'bottom', face: 'diamond', land: { x: 90, y: 0 } },
] as const satisfies readonly { name: string; face: DieFace; land: { x: number; y: number } }[]

const props = withDefaults(
  defineProps<{
    /** Face sur laquelle le dé doit s'arrêter. */
    face: DieFace | null
    /** Compteur de lancer : toute incrémentation rejoue l'animation. */
    roll?: number
    /** Durée du vol, en ms. */
    duration?: number
    /** Retard au départ, pour égrener une volée de huit dés. */
    delay?: number
    /** Nombre minimum de tours complets pendant le vol. */
    turns?: number
    /**
     * Inclinaison au repos. Laissées vides, elles sont HÉRITÉES : sur le
     * plateau, c'est un ancêtre qui pose `--die-tilt-x` / `--die-tilt-y` selon
     * la place du dé, pour que chaque dé épouse la perspective du décor.
     */
    tiltX?: number
    tiltY?: number
    /**
     * Dé POSÉ dans un logement (les huit cadres du bas) plutôt que jeté sur la
     * table : son ombre se resserre, comme un objet au contact.
     */
    seated?: boolean
    /** Agrandissement de la tuile sur la face (1 = taille naturelle). */
    artScale?: number
    /** Coupe le bruitage de ce dé — une volée n'a pas besoin de huit sons. */
    silent?: boolean
  }>(),
  {
    roll: 0,
    duration: 1100,
    delay: 0,
    turns: 2,
    tiltX: undefined,
    tiltY: undefined,
    seated: false,
    artScale: 1.57,
    silent: false,
  }
)

const emit = defineEmits<{ settled: [] }>()

/**
 * On ne pose une variable que si l'appelant l'a fournie : une valeur en ligne
 * l'emporterait sur celle héritée du plateau, et tous les dés reprendraient la
 * même inclinaison.
 */
const styleVars = computed(() => {
  const vars: Record<string, string> = { '--die-art': String(props.artScale) }
  if (props.tiltX !== undefined) vars['--die-tilt-x'] = `${props.tiltX}deg`
  if (props.tiltY !== undefined) vars['--die-tilt-y'] = `${props.tiltY}deg`
  return vars
})

const cubeEl = ref<HTMLElement | null>(null)
const hopEl = ref<HTMLElement | null>(null)
const groundEl = ref<HTMLElement | null>(null)

const { play } = useSfx()

/**
 * Orientation courante en degrés CUMULÉS (elle grandit sans jamais être ramenée
 * dans [0, 360[) : chaque lancer repart d'où le précédent s'est arrêté, donc le
 * dé ne se téléporte jamais entre deux jets.
 */
const current = { x: 0, y: 0, z: 0 }
let flights: Animation[] = []
let soundTimer: ReturnType<typeof setTimeout> | null = null

function transform(a: { x: number; y: number; z: number }): string {
  return `rotateX(${a.x}deg) rotateY(${a.y}deg) rotateZ(${a.z}deg)`
}

/**
 * Plus petite valeur ≥ `from + turns × 360` qui présente la même face que
 * `target`. Ajouter un multiple de 360° ne change pas l'orientation finale mais
 * ajoute des tours : c'est tout le truc du théâtre, on choisit la longueur du
 * vol sans toucher au résultat.
 */
function landing(from: number, target: number, turns: number): number {
  const floor = from + turns * 360
  const gap = (((target - floor) % 360) + 360) % 360
  return floor + gap
}

function stop(): void {
  for (const flight of flights) flight.cancel()
  flights = []
  if (soundTimer) clearTimeout(soundTimer)
  soundTimer = null
}

/** Pose le dé sur sa face sans animation — montage initial, ou mouvement réduit. */
function settle(target: { x: number; y: number; z: number }): void {
  current.x = target.x
  current.y = target.y
  current.z = target.z
  if (cubeEl.value) cubeEl.value.style.transform = transform(current)
}

function rollTo(face: DieFace): void {
  const cube = cubeEl.value
  const hop = hopEl.value
  const ground = groundEl.value
  if (!cube || !hop || !ground) return

  const slot = SLOTS.find((s) => s.face === face)
  if (!slot) return

  stop()

  const end = {
    x: landing(current.x, slot.land.x, props.turns + Math.floor(Math.random() * 2)),
    y: landing(current.y, slot.land.y, props.turns + 1 + Math.floor(Math.random() * 2)),
    // Le lacet n'a pas de face à présenter : n'importe quel tour entier fait
    // l'affaire, il ne sert qu'à casser la symétrie du roulis.
    z: landing(current.z, 0, 1),
  }

  // Mouvement réduit : le résultat prime sur le spectacle.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    settle(end)
    emit('settled')
    return
  }

  const { duration, delay } = props
  // Dernier basculement : le dé dépasse sa face puis se rabat dessus.
  const tip = (14 + Math.random() * 10) * (Math.random() < 0.5 ? -1 : 1)
  const drift = (Math.random() * 2 - 1) * 6

  const rise = 'cubic-bezier(.2,.72,.35,1)' // montée : on décélère vers le sommet
  const fall = 'cubic-bezier(.5,.05,.9,.55)' // chute : la gravité accélère

  flights = [
    cube.animate(
      [
        { transform: transform(current), easing: 'cubic-bezier(.1,.6,.25,1)' },
        { transform: transform({ x: end.x + tip, y: end.y + tip * 0.6, z: end.z }), offset: 0.8, easing: 'cubic-bezier(.36,0,.3,1)' },
        { transform: transform(end) },
      ],
      { duration, delay, fill: 'forwards' }
    ),
    hop.animate(
      [
        { transform: 'translate3d(0, 6%, 0) scale(0.94)', easing: rise },
        { transform: `translate3d(${drift * 0.4}%, -58%, 0) scale(1.08)`, offset: 0.32, easing: fall },
        { transform: `translate3d(${drift}%, 0, 0) scale(1)`, offset: 0.58, easing: rise },
        { transform: `translate3d(${drift * 0.7}%, -19%, 0) scale(1.03)`, offset: 0.72, easing: fall },
        { transform: `translate3d(${drift * 0.35}%, 0, 0) scale(1)`, offset: 0.86, easing: rise },
        { transform: `translate3d(${drift * 0.15}%, -5%, 0) scale(1.01)`, offset: 0.94, easing: fall },
        { transform: 'translate3d(0, 0, 0) scale(1)' },
      ],
      { duration, delay, fill: 'forwards' }
    ),
    // L'ombre au sol raconte la hauteur : loin du sol elle s'élargit et pâlit.
    ground.animate(
      [
        { opacity: 0.55, transform: 'translateX(-50%) scale(1)' },
        { opacity: 0.16, transform: 'translateX(-50%) scale(1.5)', offset: 0.32 },
        { opacity: 0.6, transform: 'translateX(-50%) scale(0.96)', offset: 0.58 },
        { opacity: 0.32, transform: 'translateX(-50%) scale(1.2)', offset: 0.72 },
        { opacity: 0.58, transform: 'translateX(-50%) scale(0.98)', offset: 0.86 },
        { opacity: 0.55, transform: 'translateX(-50%) scale(1)' },
      ],
      { duration, delay, fill: 'forwards' }
    ),
  ]

  if (!props.silent) soundTimer = setTimeout(() => play(diceRoll, 0.7), delay)

  const [spin] = flights
  spin!.onfinish = () => {
    // On fige l'orientation en style en ligne AVANT de retirer l'animation :
    // sans cela le cube reviendrait d'un coup à sa pose de départ.
    settle(end)
    stop()
    emit('settled')
  }
}

/**
 * Un seul observateur pour les deux entrées, parce qu'elles racontent deux
 * gestes différents qu'il faut distinguer :
 *
 * - le compteur bouge → un JET a eu lieu, le dé roule ;
 * - seule la face change → le dé n'a pas été jeté, il vient d'être RANGÉ (un dé
 *   gardé qui rejoint un emplacement). Il se pose sans rouler, sinon la table
 *   s'agiterait à chaque clic.
 */
watch([() => props.roll, () => props.face], ([roll, face], [previousRoll]) => {
  if (!face) return
  if (roll !== previousRoll) return rollTo(face)
  const slot = SLOTS.find((s) => s.face === face)
  if (slot) settle({ ...slot.land, z: current.z })
})

onMounted(() => {
  const slot = SLOTS.find((s) => s.face === props.face)
  if (slot) settle({ ...slot.land, z: 0 })
})

onBeforeUnmount(stop)

defineExpose({ rollTo })
</script>

<style scoped lang="scss">
// Le dé tient dans un carré dimensionné par `--die-size` : l'appelant décide de
// l'échelle (px ici, `cqw` sur le plateau) sans que le composant ne s'en mêle.
.die-cube {
  position: relative;
  width: var(--die-size, 120px);
  height: var(--die-size, 120px);
  perspective: calc(var(--die-size, 120px) * 4.5);
  perspective-origin: 50% 42%;
  // `translate` et non `transform` : le second écraserait la scène 3D.
  transition:
    opacity 0.2s ease,
    translate 0.12s ease;

  // Avant le premier jet du tour, le dé n'est pas encore sur la table — mais
  // son composant, lui, est déjà monté. C'est ce qui permet au PREMIER lancer
  // d'être animé comme les suivants : sans cela les dés apparaîtraient
  // brutalement, déjà posés sur leur face.
  &--void {
    opacity: 0;
  }

  // ── Dé rangé dans un cadre ────────────────────────────────────────────────
  // Trois indices, et aucun n'est de la géométrie : c'est l'ÉCLAIRAGE qui dit
  // à l'œil qu'un objet est dans un creux.
  &--seated {
    // 1. Il repose bas dans son logement. Vu d'un peu au-dessus, un objet posé
    //    au fond d'un cadre se lit plus près du bord proche que du centre.
    translate: 0 var(--die-seat-drop, 6%);

    // 2. Ombre de CONTACT : courte, dense, décalée du côté opposé aux
    //    lanternes du décor, qui éclairent depuis le haut du plateau.
    .die-cube__ground {
      width: 66%;
      height: 12%;
      bottom: 1%;
      opacity: 0.8;
      background: radial-gradient(ellipse at center, rgba(24, 14, 8, 0.95), rgba(24, 14, 8, 0) 72%);
    }

    // 3. Occlusion : le pied du dé s'assombrit là où il rejoint le bois, comme
    //    tout ce qui touche une surface. Sans elle, le dé reste « devant » son
    //    cadre quoi qu'on fasse par ailleurs.
    .die-cube__face {
      box-shadow:
        inset 0 0 0 1px rgba(24, 14, 8, 0.55),
        inset 0 -22% 18% -12% rgba(24, 14, 8, 0.6);
    }
  }

  // Ombre portée au sol : elle seule donne l'altitude pendant le vol.
  &__ground {
    position: absolute;
    left: 50%;
    bottom: -8%;
    width: 84%;
    height: 16%;
    transform: translateX(-50%);
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(24, 14, 8, 0.75), rgba(24, 14, 8, 0) 70%);
    opacity: 0.55;
  }

  // Trois couches distinctes, chacune un seul rôle : la translation du jet, la
  // pose au repos, la rotation du cube. Les mélanger rendrait le calcul de
  // l'orientation finale impossible à isoler.
  &__throw,
  &__scene,
  &__cube {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }

  // Le roulis vient EN PREMIER dans la liste, donc en dernier à l'application :
  // c'est une rotation dans le plan de l'écran, celle qui aligne les arêtes du
  // dé sur celles de son cadre.
  &__scene {
    transform: rotateZ(var(--die-tilt-z, 0deg)) rotateX(var(--die-tilt-x, -14deg))
      rotateY(var(--die-tilt-y, -18deg));
  }

  &__cube {
    will-change: transform;
  }

  &__face {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 8%;
    // Fond bois opaque : les coins arrondis de la tuile laisseraient sinon voir
    // l'intérieur du cube.
    background: linear-gradient(158deg, #5a3d29, #33200f);
    box-shadow: inset 0 0 0 1px rgba(24, 14, 8, 0.55);
    backface-visibility: hidden;

    $half: calc(var(--die-size, 120px) / 2);

    &--front {
      transform: translateZ($half);
    }
    &--back {
      transform: rotateY(180deg) translateZ($half);
    }
    &--right {
      transform: rotateY(90deg) translateZ($half);
    }
    &--left {
      transform: rotateY(-90deg) translateZ($half);
    }
    &--top {
      transform: rotateX(90deg) translateZ($half);
    }
    &--bottom {
      transform: rotateX(-90deg) translateZ($half);
    }
  }

  // La tuile n'occupe que ~64 % de son fichier (marge transparente + ombre) :
  // il faut l'agrandir pour qu'elle couvre la face du cube. Le reset plafonne
  // toute image à 100 %, d'où `max-width: none`.
  &__art {
    position: absolute;
    left: 50%;
    top: 50%;
    max-width: none;
    width: calc(var(--die-art, 1.57) * 100%);
    height: calc(var(--die-art, 1.57) * 100%);
    transform: translate(-50%, -50%);
  }
}
</style>
