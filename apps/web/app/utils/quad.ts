/**
 * Transformation projective à QUATRE POINTS (homographie), en `matrix3d`.
 *
 * Pourquoi pas de simples rotations : `rotateX/Y/Z` ne peuvent produire qu'un
 * trapèze SYMÉTRIQUE — trois angles et une distance de perspective, soit quatre
 * degrés de liberté. Or un cadre photographié au grand angle est un
 * quadrilatère quelconque : huit degrés de liberté, les quatre coins libres.
 * D'où le plafond qu'on atteint vite à essayer de faire coïncider les bords en
 * tournant des boutons d'angle.
 *
 * Une homographie, elle, envoie EXACTEMENT le rectangle de l'élément sur quatre
 * points choisis. On ne règle plus des angles, on pose les coins là où le décor
 * les dessine — et ça coïncide, par construction.
 *
 * Le prix à payer : la transformation n'est plus une rotation dans l'espace,
 * donc rien ne vit « en 3D » derrière. Pour une carte plate posée à plat, c'est
 * exactement ce qu'il faut.
 */
export interface Point {
  x: number
  y: number
}

/** Les quatre coins d'une zone, en % du plateau. */
export interface Quad {
  topLeft: Point
  topRight: Point
  bottomRight: Point
  bottomLeft: Point
}

// ── Algèbre 3×3, en ordre ligne-major ────────────────────────────────────────

function multiplyMM(a: number[], b: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0
      for (let k = 0; k < 3; k++) sum += a[3 * i + k]! * b[3 * k + j]!
      out[3 * i + j] = sum
    }
  }
  return out
}

function multiplyMV(m: number[], v: number[]): number[] {
  return [
    m[0]! * v[0]! + m[1]! * v[1]! + m[2]! * v[2]!,
    m[3]! * v[0]! + m[4]! * v[1]! + m[5]! * v[2]!,
    m[6]! * v[0]! + m[7]! * v[1]! + m[8]! * v[2]!,
  ]
}

/** Comatrice transposée : l'inverse à un facteur d'échelle près, qui s'annule ici. */
function adjugate(m: number[]): number[] {
  return [
    m[4]! * m[8]! - m[5]! * m[7]!,
    m[2]! * m[7]! - m[1]! * m[8]!,
    m[1]! * m[5]! - m[2]! * m[4]!,
    m[5]! * m[6]! - m[3]! * m[8]!,
    m[0]! * m[8]! - m[2]! * m[6]!,
    m[2]! * m[3]! - m[0]! * m[5]!,
    m[3]! * m[7]! - m[4]! * m[6]!,
    m[1]! * m[6]! - m[0]! * m[7]!,
    m[0]! * m[4]! - m[1]! * m[3]!,
  ]
}

/**
 * Matrice envoyant la base projective canonique sur quatre points. Trois points
 * fixent une base ; le quatrième donne les poids qui rendent l'application
 * projective plutôt qu'affine.
 */
function basisToPoints(p1: Point, p2: Point, p3: Point, p4: Point): number[] {
  const m = [p1.x, p2.x, p3.x, p1.y, p2.y, p3.y, 1, 1, 1]
  const v = multiplyMV(adjugate(m), [p4.x, p4.y, 1])
  return multiplyMM(m, [v[0]!, 0, 0, 0, v[1]!, 0, 0, 0, v[2]!])
}

/**
 * `transform` envoyant le rectangle `width × height` de l'élément sur les
 * quatre `corners`, exprimés en pixels dans le repère LOCAL de l'élément.
 *
 * À utiliser avec `transform-origin: 0 0` : la matrice part du coin haut-gauche,
 * pas du centre.
 */
export function quadTransform(width: number, height: number, corners: Point[]): string {
  if (width <= 0 || height <= 0) return 'none'

  // Même ordre des deux côtés : haut-gauche, haut-droit, bas-gauche, bas-droit.
  const source = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height },
    { x: width, y: height },
  ]
  const t = multiplyMM(
    basisToPoints(corners[0]!, corners[1]!, corners[2]!, corners[3]!),
    adjugate(basisToPoints(source[0]!, source[1]!, source[2]!, source[3]!))
  )

  // Une homographie est définie à un facteur près : on normalise pour que le
  // terme homogène vaille 1, sinon l'échelle dérive avec la taille de l'écran.
  const n = t.map((v) => v / t[8]!)

  // `matrix3d` est en ordre COLONNE-major, et les termes de perspective vont en
  // quatrième ligne de chaque colonne.
  return `matrix3d(${[
    n[0], n[3], 0, n[6],
    n[1], n[4], 0, n[7],
    0, 0, 1, 0,
    n[2], n[5], 0, n[8],
  ].join(',')})`
}

/** Boîte englobante d'un quadrilatère, en % du plateau. */
export function quadBounds(quad: Quad): { left: number; top: number; width: number; height: number } {
  const points = [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top }
}

/**
 * Pose la zone : la boîte englobante en style, puis la matrice qui envoie cette
 * boîte sur les quatre coins. L'élément doit être `position: absolute` dans le
 * plateau, et déclarer `transform-origin: 0 0`.
 */
export function applyQuad(el: HTMLElement, quad: Quad): void {
  const bounds = quadBounds(quad)
  el.style.left = `${bounds.left}%`
  el.style.top = `${bounds.top}%`
  el.style.width = `${bounds.width}%`
  el.style.height = `${bounds.height}%`

  const { width, height } = el.getBoundingClientRect()
  // Les coins passent du repère du plateau à celui de l'élément.
  const local = [quad.topLeft, quad.topRight, quad.bottomLeft, quad.bottomRight].map((p) => ({
    x: ((p.x - bounds.left) / bounds.width) * width,
    y: ((p.y - bounds.top) / bounds.height) * height,
  }))
  el.style.transform = quadTransform(width, height, local)
}
