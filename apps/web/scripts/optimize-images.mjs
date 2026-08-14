/**
 * Optimisation des images du jeu.
 *
 * Convertit tous les PNG/JPG de `app/assets/images/` en WebP, redimensionne au
 * plus grand format réellement utile, supprime l'original, puis met à jour les
 * imports dans le code — le tout sans rien changer à ton flux de travail :
 *
 *   1. tu déposes tes images (PNG/JPG) dans app/assets/images/…
 *   2. tu lances `npm run assets -w @rf/web`
 *
 * Les fichiers déjà en WebP sont ignorés : le script est réexécutable sans
 * risque (idempotent). Utilise `--dry` pour voir ce qu'il ferait sans écrire.
 */
import { readdir, readFile, writeFile, stat, unlink } from 'node:fs/promises'
import { join, extname, relative, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = join(ROOT, 'app', 'assets', 'images')
const CODE_DIRS = [join(ROOT, 'app')]
const CODE_EXT = new Set(['.vue', '.ts', '.js', '.scss', '.css'])
const SOURCE_EXT = new Set(['.png', '.jpg', '.jpeg'])
const DRY = process.argv.includes('--dry')
/** Passage à part : réduire les WebP DÉJÀ convertis mais trop grands. */
const RESIZE = process.argv.includes('--resize')

/**
 * Largeur maximale par dossier, calée sur la taille d'affichage réelle
 * (×2 pour les écrans haute densité). Au-delà, on ne gagne que du poids.
 */
const MAX_WIDTH = {
  dice: 320, // un dé occupe ~9,5 % d'un plateau de 1600 px → ~150 px
  character: 400, // avatar dans un cercle de ~40 px
  cards: 420, // carte affichée sur 192 px de large (mesuré à 1440)
  ui: 2000, // décor plein écran (layout, loader)
  _default: 1200
}

/**
 * Exceptions par FICHIER, parce que `ui/` mêle deux mondes : des décors plein
 * écran, qui méritent leurs 1700 px, et des pièces minuscules qui traînaient la
 * même définition — une icône de 1024² pour un bouton de 35 px.
 *
 * Les tailles d'affichage sont MESURÉES sur une fenêtre de 1440 px, et doublées
 * pour les écrans à haute densité.
 */
const MAX_WIDTH_FILE = {
  'wax-seal-lancer.webp': 256, // cachet affiché à 110 px
  'wax-seal-stop.webp': 256,
  'icon-rules.webp': 96, // bouton de 35 px
  'gamer-slot.webp': 384, // fiche joueur de ~140 px
  'main-cta.webp': 900, // plaque de 320 px, image dessinée à 130 %
  'panel-bareme.webp': 540, // planche de tiroir, 341 px de large
  'main-title.webp': 900 // plus large usage : 46 % du chargeur
}

const KB = n => `${(n / 1024).toFixed(0)} Ko`

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

function maxWidthFor(file) {
  const byFile = MAX_WIDTH_FILE[basename(file)]
  if (byFile) return byFile
  const folder = relative(IMAGES, file).split(/[\\/]/)[0]
  return MAX_WIDTH[folder] ?? MAX_WIDTH._default
}

async function convert(file) {
  const before = (await stat(file)).size
  const target = file.replace(/\.(png|jpe?g)$/i, '.webp')
  const img = sharp(file)
  const meta = await img.metadata()
  const max = maxWidthFor(file)
  const resize = meta.width && meta.width > max ? { width: max } : null

  let pipe = sharp(file)
  if (resize) pipe = pipe.resize(resize)
  pipe = pipe.webp({ quality: 82, effort: 6 })

  // En simulation on compresse en mémoire : on mesure le gain réel sans écrire.
  let after
  if (DRY) {
    after = (await pipe.toBuffer()).byteLength
  } else {
    await pipe.toFile(target)
    await unlink(file)
    after = (await stat(target)).size
  }
  return { file, target, before, after, from: meta.width, to: resize ? max : meta.width }
}

/** Réécrit les références `.png`/`.jpg` vers `.webp` dans le code source. */
async function rewriteImports(renames) {
  const map = new Map(renames.map(r => [basename(r.file), basename(r.target)]))
  let touched = 0
  for (const dir of CODE_DIRS) {
    for (const f of await walk(dir)) {
      if (!CODE_EXT.has(extname(f))) continue
      const src = await readFile(f, 'utf8')
      let out = src
      for (const [oldName, newName] of map) out = out.split(oldName).join(newName)
      if (out !== src) {
        if (!DRY) await writeFile(f, out, 'utf8')
        touched++
        console.log(`  ↳ imports mis à jour : ${relative(ROOT, f)}`)
      }
    }
  }
  return touched
}

/**
 * Réduit une image DÉJÀ en WebP qui dépasse sa taille utile.
 *
 * Le mode normal ignore les WebP — c'est ce qui rend le script réexécutable
 * sans risque. Mais une image trop grande le reste alors pour toujours, et le
 * coût n'est pas que le poids : ce sont surtout des millions de pixels à
 * DÉCODER au démarrage. D'où ce passage à part, à lancer sciemment.
 */
async function shrink(file) {
  const before = (await stat(file)).size
  const meta = await sharp(file).metadata()
  const max = maxWidthFor(file)
  if (!meta.width || meta.width <= max) return null

  // `toBuffer` puis écriture : sharp ne peut pas écrire dans le fichier qu'il
  // est en train de lire.
  const buffer = await sharp(file).resize({ width: max }).webp({ quality: 82, effort: 6 }).toBuffer()
  if (!DRY) await writeFile(file, buffer)
  return { file, before, after: buffer.byteLength, from: meta.width, to: max }
}

async function resizeExisting() {
  const files = (await walk(IMAGES)).filter(f => extname(f).toLowerCase() === '.webp')
  const results = []
  for (const f of files) {
    const r = await shrink(f)
    if (!r) continue
    results.push(r)
    const gain = (1 - r.after / r.before) * 100
    console.log(
      `  ${relative(IMAGES, r.file).padEnd(42)} ${KB(r.before).padStart(8)} → ${KB(r.after).padStart(8)}  (−${gain.toFixed(0)} %)  ${r.from}→${r.to}px`
    )
  }
  if (results.length === 0) {
    console.log('Aucune image ne dépasse sa taille utile.')
    return
  }
  const before = results.reduce((s, r) => s + r.before, 0)
  const after = results.reduce((s, r) => s + r.after, 0)
  const pixels = results.reduce((s, r) => s + (r.from / r.to) ** 2, 0)
  console.log(`\n${results.length} image(s) réduite(s) : ${KB(before)} → ${KB(after)}  (−${((1 - after / before) * 100).toFixed(0)} %)`)
  console.log(`Pixels à décoder divisés par ${(pixels / results.length).toFixed(1)} en moyenne.`)
  if (DRY) console.log('\n(simulation : aucun fichier modifié)')
}

async function main() {
  if (RESIZE) return resizeExisting()

  const files = (await walk(IMAGES)).filter(f => SOURCE_EXT.has(extname(f).toLowerCase()))
  if (files.length === 0) {
    console.log('Rien à convertir — toutes les images sont déjà en WebP.')
    return
  }

  console.log(`${files.length} image(s) à convertir${DRY ? ' (simulation)' : ''}\n`)
  const results = []
  for (const f of files) {
    const r = await convert(f)
    results.push(r)
    const gain = r.before > 0 ? (1 - r.after / r.before) * 100 : 0
    const resized = r.from !== r.to ? ` ${r.from}→${r.to}px` : ''
    console.log(`  ${relative(IMAGES, r.file).padEnd(42)} ${KB(r.before).padStart(8)} → ${KB(r.after).padStart(8)}  (−${gain.toFixed(0)} %)${resized}`)
  }

  console.log('')
  const touched = await rewriteImports(results)

  const before = results.reduce((s, r) => s + r.before, 0)
  const after = results.reduce((s, r) => s + r.after, 0)
  console.log(`\nTotal : ${KB(before)} → ${KB(after)}  (−${((1 - after / before) * 100).toFixed(0)} %)`)
  console.log(`${touched} fichier(s) source mis à jour.`)
  if (DRY) console.log('\n(simulation : aucun fichier modifié)')
}

main().catch(err => {
  console.error('Échec de l’optimisation :', err)
  process.exit(1)
})
