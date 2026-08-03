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

/**
 * Largeur maximale par dossier, calée sur la taille d'affichage réelle
 * (×2 pour les écrans haute densité). Au-delà, on ne gagne que du poids.
 */
const MAX_WIDTH = {
  dice: 320, // un dé occupe ~9,5 % d'un plateau de 1600 px → ~150 px
  character: 400, // avatar dans un cercle de ~40 px
  cards: 700, // carte affichée sur ~14 % de large
  ui: 2000, // décor plein écran (layout, loader)
  _default: 1200
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

async function main() {
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
