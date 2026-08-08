/**
 * Persistance des salles sur disque.
 *
 * Le seul module qui connaisse le système de fichiers. Il ne sait rien des
 * règles ni du réseau : il écrit un tableau de photographies opaques et le
 * relit. Remplacer le fichier par une base ne demanderait que de réécrire ces
 * deux fonctions.
 *
 * Un seul fichier, et non un par salle : les parties en cours se comptent en
 * unités, pas en milliers, et une écriture unique se remplace de façon atomique.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { RoomSnapshot } from './room.js'

/**
 * `RF_DATA_DIR` permet de pointer un volume monté — c'est ce qui rend la
 * persistance utile en conteneur, où le système de fichiers de l'image
 * disparaît à chaque redéploiement.
 */
const FILE = process.env.RF_DATA_DIR
  ? join(process.env.RF_DATA_DIR, 'rooms.json')
  : join(process.cwd(), 'data', 'rooms.json')

/**
 * Au-delà, on n'essaie plus de reprendre : personne ne revient sur une partie
 * abandonnée la veille, et une salle ressuscitée pour rien occupe un code.
 */
export const STALE_MS = 12 * 60 * 60 * 1_000

/**
 * Dernier contenu écrit. Un serveur au repos repasse ici toutes les 5 s avec
 * exactement le même JSON : réécrire pour rien userait une carte SD — le
 * Raspberry Pi est une cible assumée — sans rien apporter.
 *
 * `savedAt` change à chaque photographie, donc une partie VIVANTE se réécrit
 * bien à chaque passage : la comparaison n'économise que le vrai repos.
 */
let lastWritten: string | null = null

/**
 * Écriture ATOMIQUE : on écrit à côté puis on renomme. Sans cela, une coupure
 * au milieu de l'écriture laisserait un JSON tronqué — et le redémarrage
 * suivant perdrait TOUTES les parties au lieu d'une.
 */
export function saveRooms(snapshots: RoomSnapshot[]): void {
  const payload = JSON.stringify(snapshots)
  if (payload === lastWritten) return

  try {
    mkdirSync(dirname(FILE), { recursive: true })
    const temp = `${FILE}.tmp`
    writeFileSync(temp, payload, 'utf8')
    renameSync(temp, FILE)
    lastWritten = payload
  } catch (err) {
    // Ne jamais tuer le serveur pour une sauvegarde ratée : les parties en cours
    // valent mieux qu'une reprise hypothétique après redémarrage.
    console.warn('[serveur] sauvegarde impossible :', (err as Error).message)
  }
}

/** Relit les salles sauvegardées. Un fichier absent ou illisible rend `[]`. */
export function loadRooms(now: number): RoomSnapshot[] {
  let raw: string
  try {
    raw = readFileSync(FILE, 'utf8')
  } catch {
    return [] // premier démarrage : il n'y a rien à reprendre, ce n'est pas une erreur
  }

  try {
    const saved = JSON.parse(raw) as RoomSnapshot[]
    if (!Array.isArray(saved)) return []
    return saved.filter((s) => s?.code && s.game && now - s.savedAt < STALE_MS)
  } catch (err) {
    console.warn('[serveur] sauvegarde illisible, ignorée :', (err as Error).message)
    return []
  }
}
