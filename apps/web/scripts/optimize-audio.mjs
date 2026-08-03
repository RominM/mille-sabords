/**
 * Optimisation des sons du jeu.
 *
 * Convertit les WAV/AIFF de `app/assets/sounds/` en MP3, supprime l'original,
 * puis met à jour les imports dans le code — même principe que le script des
 * images, et même flux de travail :
 *
 *   1. tu déposes tes sons dans app/assets/sounds/…
 *   2. tu lances `npm run assets -w @rf/web`
 *
 * Les MP3/OGG déjà présents sont ignorés : le script est réexécutable sans
 * risque (idempotent). Utilise `--dry` pour voir ce qu'il ferait sans écrire.
 */
import { readdir, readFile, writeFile, stat, unlink } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, extname, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'ffmpeg-static'

const run = promisify(execFile)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOUNDS = join(ROOT, 'app', 'assets', 'sounds')
const CODE_DIRS = [join(ROOT, 'app')]
const CODE_EXT = new Set(['.vue', '.ts', '.js', '.scss', '.css'])
const SOURCE_EXT = new Set(['.wav', '.aiff', '.aif', '.flac'])
const DRY = process.argv.includes('--dry')

/**
 * Débit selon l'usage : une musique de fond n'a pas besoin de plus de 128 kbps,
 * un bruitage court encore moins.
 */
const BITRATE = { music: '128k', sfx: '96k' }
const MUSIC_HINT = /(music|ambian|ambien|waters|theme)/i

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

async function convert(file) {
  const target = file.slice(0, -extname(file).length) + '.mp3'
  const before = (await stat(file)).size
  const bitrate = MUSIC_HINT.test(basename(file)) ? BITRATE.music : BITRATE.sfx

  if (DRY) {
    console.log(`  ${basename(file)} → ${basename(target)} (${bitrate}, ${KB(before)})`)
    return { before, after: before, from: basename(file), to: basename(target) }
  }

  await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', file, '-codec:a', 'libmp3lame', '-b:a', bitrate, target])
  const after = (await stat(target)).size
  await unlink(file)
  console.log(
    `  ${basename(file)} → ${basename(target)}  ${KB(before)} → ${KB(after)}  (−${Math.round((1 - after / before) * 100)} %)`
  )
  return { before, after, from: basename(file), to: basename(target) }
}

/** Réécrit les imports pour pointer sur les nouveaux fichiers. */
async function rewriteImports(renames) {
  if (!renames.length) return
  const files = (await Promise.all(CODE_DIRS.map(walk))).flat().filter(f => CODE_EXT.has(extname(f)))
  let touched = 0
  for (const file of files) {
    const src = await readFile(file, 'utf8')
    let out = src
    for (const { from, to } of renames) out = out.split(from).join(to)
    if (out !== src) {
      if (!DRY) await writeFile(file, out, 'utf8')
      touched++
      console.log(`  maj ${basename(file)}`)
    }
  }
  console.log(`${touched} fichier(s) de code mis à jour`)
}

async function main() {
  let files = []
  try {
    files = (await walk(SOUNDS)).filter(f => SOURCE_EXT.has(extname(f).toLowerCase()))
  } catch {
    console.log('Aucun dossier de sons.')
    return
  }
  if (!files.length) {
    console.log('Sons déjà optimisés — rien à faire.')
    return
  }

  console.log(`${files.length} son(s) à convertir${DRY ? ' (simulation)' : ''} :`)
  const results = []
  for (const f of files) results.push(await convert(f))

  const before = results.reduce((s, r) => s + r.before, 0)
  const after = results.reduce((s, r) => s + r.after, 0)
  console.log(`\nTotal : ${KB(before)} → ${KB(after)} (−${Math.round((1 - after / before) * 100)} %)\n`)

  await rewriteImports(results)
}

main().catch(err => {
  console.error('Échec de l’optimisation audio :', err)
  process.exit(1)
})
