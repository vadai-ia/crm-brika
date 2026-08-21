import { createAdminClient } from '@/lib/supabase/admin'
import * as sets from '@/lib/dal/image-sets'
import { invalidateSetListCache } from '@/lib/dal/property-images'
import type { ImageSetRow, ImageSetStatus, PendingSet, PhotoManifest, SyncProgress, SyncStepResult } from '@/types/inventario'
import { collectFiles, downloadFile, folderIdFromUrl, listFolder, type DriveFile } from './drive'
import { optimizeImage } from './optimize'
import { emptyManifest, readManifest, removeExcept, uploadPhoto, writeManifest } from './bucket'

// Importación automática de fotos (ERROR-JOURNAL #23). Diseño resumible: cada
// llamada a syncStep() procesa UNA foto (descarga + optimiza + sube) y guarda el
// avance en el manifiesto y en image_sets, así nunca choca con el límite de
// tiempo de una función serverless; el cliente (usePhotoSync) o el cron llaman
// en bucle hasta que done = true.
const ACTIVE: ImageSetStatus[] = ['pending', 'syncing']
const RETRY_ERRORS_AFTER_MS = 24 * 60 * 60 * 1000

function emptyProgress(): SyncProgress {
  return { total: 0, done: 0, skipped: [] }
}

/** Carpeta de Drive → ids de las propiedades que la referencian. */
async function foldersFromInventory(): Promise<Map<string, string[]>> {
  const byFolder = new Map<string, string[]>()
  for (const p of await sets.getPropertyLinks()) {
    const fid = folderIdFromUrl(p.link)
    if (!fid) continue
    if (!byFolder.has(fid)) byFolder.set(fid, [])
    byFolder.get(fid)!.push(p.id)
  }
  return byFolder
}

function toPending(rows: ImageSetRow[], folders: Map<string, string[]>): PendingSet[] {
  return rows.map((r) => ({
    setId: r.id,
    title: r.drive_title,
    status: r.status,
    progress: r.progress,
    propertyIds: folders.get(r.drive_folder_id) ?? [],
    lastError: r.last_error,
  }))
}

/**
 * Revisa el inventario (solo BD, rápido): crea en image_sets (pending) las
 * carpetas de Drive que aún no tienen set y mapea en propiedad_image_sets las
 * propiedades con link que no tienen set o tienen otro. Devuelve lo pendiente.
 */
export async function detectPending(): Promise<PendingSet[]> {
  const [folders, rows, mappings] = await Promise.all([
    foldersFromInventory(),
    sets.getAllImageSets(),
    sets.getMappings(),
  ])
  const rowByFolder = new Map(rows.map((r) => [r.drive_folder_id, r]))
  let next: number | null = null
  for (const [fid, propIds] of folders) {
    let row = rowByFolder.get(fid)
    if (!row) {
      if (next === null) next = await sets.nextFreeSetId()
      const id = next++
      await sets.upsertImageSet({ id, drive_folder_id: fid, status: 'pending', progress: null, last_error: null })
      row = { id, drive_folder_id: fid, status: 'pending' } as ImageSetRow
      rowByFolder.set(fid, row)
      rows.push(row)
    }
    const setId = row.id
    const unmapped = propIds.filter((pid) => mappings.get(pid) !== setId)
    if (unmapped.length) await sets.mapProperties(unmapped, setId)
  }
  return toPending(rows.filter((r) => ACTIVE.includes(r.status)), folders)
}

/** Sets pendientes o en curso, sin revisar el inventario. */
export async function listPending(): Promise<PendingSet[]> {
  const rows = await sets.getImageSetsByStatus(ACTIVE)
  if (rows.length === 0) return []
  return toPending(rows, await foldersFromInventory())
}

/** Nombre único dentro del set (otra foto del manifiesto ya puede llamarse igual). */
function uniqueName(name: string, file: DriveFile, manifest: PhotoManifest, driveId: string): string {
  const taken = new Set(Object.entries(manifest.files).filter(([id]) => id !== driveId).map(([, f]) => f.name))
  if (!taken.has(name)) return name
  const sub = file.sub.replace(/\/$/, '').replace(/\//g, ' - ')
  let candidate = sub ? `${sub} - ${name}` : name
  for (let n = 2; taken.has(candidate); n++) candidate = name.replace(/(\.[a-z0-9]+)$/i, ` (${n})$1`)
  return candidate
}

/** Un paso de sincronización del set: importa una foto, o finaliza si no falta ninguna. */
export async function syncStep(setId: number): Promise<SyncStepResult> {
  const row = await sets.getImageSet(setId)
  if (!row) throw new Error(`El set ${setId} no existe`)
  const supabase = createAdminClient()
  const folders = await foldersFromInventory()
  const propertyIds = folders.get(row.drive_folder_id) ?? []
  const progress: SyncProgress = row.progress ?? emptyProgress()

  const node = await listFolder(row.drive_folder_id)
  if (!node.public) {
    const error = `No se pudo leer la carpeta de Drive: ${node.reason}. Compártela como "Cualquier persona con el enlace → Lector".`
    await sets.updateImageSet(setId, { status: 'error', last_error: error, progress })
    return { setId, done: true, status: 'error', progress, title: row.drive_title, error, propertyIds }
  }

  const driveFiles = collectFiles(node)
  const manifest = (await readManifest(supabase, setId)) ?? emptyManifest(setId, row.drive_folder_id)
  const driveIds = new Set(driveFiles.map((f) => f.id))
  for (const id of Object.keys(manifest.files)) if (!driveIds.has(id)) delete manifest.files[id] // borradas en Drive
  const skippedIds = new Set(progress.skipped.map((s) => s.id))
  const pending = driveFiles.filter((f) => !manifest.files[f.id] && !skippedIds.has(f.id))
  progress.total = driveFiles.length
  manifest.driveTitle = node.title

  if (pending.length > 0) {
    const file = pending[0]
    try {
      const dl = await downloadFile(file)
      const opt = await optimizeImage(dl.name, dl.buffer)
      const name = uniqueName(opt.name, file, manifest, file.id)
      await uploadPhoto(supabase, setId, name, opt.web, opt.thumb)
      manifest.files[file.id] = { name, sourceName: `${file.sub}${file.title}`, sourceSize: dl.buffer.length, width: opt.width, height: opt.height }
    } catch (err) {
      progress.skipped.push({ id: file.id, name: `${file.sub}${file.title}`, reason: err instanceof Error ? err.message : String(err) })
    }
    await writeManifest(supabase, manifest)
    progress.done = Object.keys(manifest.files).length + progress.skipped.length
    await sets.updateImageSet(setId, { status: 'syncing', progress, drive_title: node.title, last_error: null })
    return { setId, done: false, status: 'syncing', progress, title: node.title, error: null, propertyIds }
  }

  // Finalizar: limpiar lo que ya no está en Drive, mapear propiedades, marcar estado
  const keep = new Set(Object.values(manifest.files).map((f) => f.name))
  await removeExcept(supabase, setId, keep)
  manifest.syncedAt = new Date().toISOString()
  await writeManifest(supabase, manifest)
  await sets.mapProperties(propertyIds, setId)
  invalidateSetListCache(setId)
  progress.done = Object.keys(manifest.files).length + progress.skipped.length
  const status: ImageSetStatus = progress.skipped.length ? 'error' : 'ok'
  const error = progress.skipped.length
    ? `${progress.skipped.length} foto(s) no se pudieron importar: ${progress.skipped.map((s) => `${s.name} (${s.reason})`).join('; ')}`
    : null
  await sets.updateImageSet(setId, { status, progress, drive_title: node.title, last_synced_at: manifest.syncedAt, last_error: error })
  return { setId, done: true, status, progress, title: node.title, error, propertyIds }
}

/**
 * Revisa si la carpeta de Drive de un set ya importado cambió (fotos nuevas,
 * borradas o renombrada) y, si es así, lo marca pendiente. Un set en error se
 * reintenta pasadas 24 h. Anota la revisión en progress.checkedAt.
 */
export async function checkForChanges(row: ImageSetRow): Promise<boolean> {
  const now = new Date().toISOString()
  const progress: SyncProgress = { ...(row.progress ?? emptyProgress()), checkedAt: now }
  if (row.status === 'error') {
    const age = Date.now() - new Date(row.updated_at).getTime()
    if (age < RETRY_ERRORS_AFTER_MS) {
      await sets.updateImageSet(row.id, { progress })
      return false
    }
    await sets.updateImageSet(row.id, { status: 'pending', progress: { ...progress, skipped: [] }, last_error: null })
    return true
  }
  const node = await listFolder(row.drive_folder_id)
  if (!node.public) {
    await sets.updateImageSet(row.id, { progress })
    return false
  }
  const ids = new Set(collectFiles(node).map((f) => f.id))
  const manifest = await readManifest(createAdminClient(), row.id)
  const known = new Set(Object.keys(manifest?.files ?? {}))
  const skipped = new Set(progress.skipped.map((s) => s.id))
  const changed =
    [...ids].some((id) => !known.has(id) && !skipped.has(id)) ||
    [...known].some((id) => !ids.has(id)) ||
    node.title !== row.drive_title
  await sets.updateImageSet(row.id, { progress, ...(changed ? { status: 'pending' as ImageSetStatus } : {}) })
  return changed
}

const CHECK_EVERY_MS = 24 * 60 * 60 * 1000

/**
 * Revisión ligera que el cliente dispara al abrir Propiedades: revisa hasta
 * `limit` sets que no se han revisado en 24 h (los más viejos primero). Sin
 * cron: si nadie abre el CRM no se revisa, y no cuesta nada extra.
 */
export async function checkStaleSets(limit: number): Promise<{ checked: number; changed: number; remaining: number }> {
  const cutoff = Date.now() - CHECK_EVERY_MS
  const stale = (await sets.getAllImageSets())
    .filter((r) => !ACTIVE.includes(r.status))
    .filter((r) => !r.progress?.checkedAt || new Date(r.progress.checkedAt).getTime() < cutoff)
    .sort((a, b) => new Date(a.progress?.checkedAt ?? 0).getTime() - new Date(b.progress?.checkedAt ?? 0).getTime())
  let changed = 0
  const batch = stale.slice(0, limit)
  for (const row of batch) {
    if (await checkForChanges(row)) changed++
  }
  return { checked: batch.length, changed, remaining: Math.max(0, stale.length - batch.length) }
}
