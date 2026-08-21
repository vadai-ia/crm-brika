import { createAdminClient } from '@/lib/supabase/admin'
import type { PhotoManifest } from '@/types/inventario'

// Bucket público `Imagenes`: <set>/<nombre> (web), _thumbs/<set>/<nombre>
// (miniatura) y _manifest/<set>.json (archivo de Drive → nombre). Mismo
// formato que scripts/fotos/sync-fotos.cjs.
export const IMAGES_BUCKET = 'Imagenes'
export const THUMBS_PREFIX = '_thumbs'
const MANIFEST_PREFIX = '_manifest'

type Admin = ReturnType<typeof createAdminClient>
const bucket = (supabase: Admin) => supabase.storage.from(IMAGES_BUCKET)

export function emptyManifest(setId: number, driveFolderId: string): PhotoManifest {
  return { setId, driveFolderId, driveTitle: '', syncedAt: '', files: {} }
}

export async function readManifest(supabase: Admin, setId: number): Promise<PhotoManifest | null> {
  const { data, error } = await bucket(supabase).download(`${MANIFEST_PREFIX}/${setId}.json`)
  if (error || !data) return null
  try {
    return JSON.parse(await data.text()) as PhotoManifest
  } catch {
    return null
  }
}

export async function writeManifest(supabase: Admin, manifest: PhotoManifest): Promise<void> {
  const { error } = await bucket(supabase).upload(
    `${MANIFEST_PREFIX}/${manifest.setId}.json`,
    Buffer.from(JSON.stringify(manifest, null, 1)),
    { contentType: 'application/json', upsert: true }
  )
  if (error) throw new Error(`manifiesto ${manifest.setId}: ${error.message}`)
}

/** Nombres de archivo (no carpetas) bajo un prefijo. */
export async function listNames(supabase: Admin, prefix: string): Promise<string[]> {
  const { data, error } = await bucket(supabase).list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${prefix}: ${error.message}`)
  return (data ?? []).filter((i) => i.metadata !== null).map((i) => i.name)
}

export async function uploadPhoto(
  supabase: Admin,
  setId: number,
  name: string,
  web: { buffer: Buffer; contentType: string },
  thumb: { buffer: Buffer; contentType: string }
): Promise<void> {
  let r = await bucket(supabase).upload(`${setId}/${name}`, web.buffer, { contentType: web.contentType, upsert: true })
  if (r.error) throw new Error(`subir ${setId}/${name}: ${r.error.message}`)
  r = await bucket(supabase).upload(`${THUMBS_PREFIX}/${setId}/${name}`, thumb.buffer, { contentType: thumb.contentType, upsert: true })
  if (r.error) throw new Error(`subir miniatura ${setId}/${name}: ${r.error.message}`)
}

/** Borra de <set>/ y _thumbs/<set>/ todo lo que no esté en `keep`. */
export async function removeExcept(supabase: Admin, setId: number, keep: Set<string>): Promise<number> {
  const [web, thumbs] = await Promise.all([
    listNames(supabase, String(setId)),
    listNames(supabase, `${THUMBS_PREFIX}/${setId}`),
  ])
  const paths = [
    ...web.filter((n) => !keep.has(n)).map((n) => `${setId}/${n}`),
    ...thumbs.filter((n) => !keep.has(n)).map((n) => `${THUMBS_PREFIX}/${setId}/${n}`),
  ]
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket(supabase).remove(paths.slice(i, i + 100))
    if (error) throw new Error(`borrar en set ${setId}: ${error.message}`)
  }
  return paths.length
}
