import { createAdminClient } from '@/lib/supabase/admin'
import { getImageMetaByPropertyIds, orderNames } from '@/lib/dal/image-visibility'
import type { PropertyCover, PropertyImage, PropertyImageSet } from '@/types/inventario'

const IMAGES_BUCKET = 'Imagenes'
const THUMBS_PREFIX = '_thumbs'
const IMAGE_SETS_TABLE = 'propiedad_image_sets'
const IMAGE_FILE_RE = /\.(jpe?g|png|webp)$/i
const COVER_NAME_RE = /portada|fachada|cover/i
const LIST_CACHE_TTL_MS = 5 * 60 * 1000

type Admin = ReturnType<typeof createAdminClient>

// Las imágenes viven en el bucket público `Imagenes`: `propiedad_image_sets`
// liga cada propiedad (uuid) con una carpeta `{image_set_id}/1.jpg, 2.jpg...`
// que ya está en tamaño web (≤1600 px), con su miniatura (640 px) en
// `_thumbs/{image_set_id}/{name}`. Se sirven directo con /object/public/:
// NUNCA usar /render/image/ (Supabase cobra cada imagen transformada; ver
// ERROR-JOURNAL #22). Las genera photo-sync / scripts/fotos/sync-fotos.cjs.
// Muchas propiedades comparten set (312 filas → ~47 sets), así que el listado
// de cada carpeta se cachea en memoria unos minutos. Visibilidad y orden por
// propiedad (propiedad_imagenes_visibilidad) NO se cachean: se leen por request.
const listCache = new Map<number, { names: string[]; expires: number }>()

/** Tras importar fotos a un set (photo-sync), el siguiente listado vuelve a ir al bucket. */
export function invalidateSetListCache(setId: number): void {
  listCache.delete(setId)
}

/** Nombres de imagen del set en orden natural (portada/fachada/cover primero). */
async function listSetImages(supabase: Admin, setId: number): Promise<string[]> {
  const cached = listCache.get(setId)
  if (cached && cached.expires > Date.now()) return cached.names

  const { data: files, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .list(String(setId), { limit: 200 })
  if (error) {
    console.error(`Error listing image set ${setId}:`, error.message)
    return cached?.names ?? []
  }

  const names = (files ?? [])
    .filter((f) => f.metadata !== null) // las subcarpetas vienen sin metadata
    .map((f) => f.name)
    .filter((n) => IMAGE_FILE_RE.test(n))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const coverIdx = names.findIndex((n) => COVER_NAME_RE.test(n))
  if (coverIdx > 0) names.unshift(...names.splice(coverIdx, 1))

  listCache.set(setId, { names, expires: Date.now() + LIST_CACHE_TTL_MS })
  return names
}

/** URL pública directa (sin transformación). `thumb` = miniatura de 640 px, `full` = versión web. */
function imageUrl(supabase: Admin, setId: number, name: string, variant: 'thumb' | 'full'): string {
  const objectPath = variant === 'thumb' ? `${THUMBS_PREFIX}/${setId}/${name}` : `${setId}/${name}`
  return supabase.storage.from(IMAGES_BUCKET).getPublicUrl(objectPath).data.publicUrl
}

async function getSetIdsByPropertyIds(
  supabase: Admin,
  ids: string[]
): Promise<Map<string, number>> {
  const setByProp = new Map<string, number>()
  if (ids.length === 0) return setByProp

  const { data, error } = await supabase
    .from(IMAGE_SETS_TABLE)
    .select('propiedad_id, image_set_id')
    .in('propiedad_id', ids)
  if (error) {
    console.error('Error fetching image sets:', error.message)
    return setByProp
  }
  for (const row of data ?? []) {
    if (row.propiedad_id && row.image_set_id != null) {
      setByProp.set(String(row.propiedad_id), Number(row.image_set_id))
    }
  }
  return setByProp
}

/**
 * Portada por propiedad = primera foto VISIBLE en el orden elegido (si todas
 * están ocultas, la primera), más total de fotos y cuántas están ocultas.
 */
export async function getInventarioCoversByIds(
  ids: string[]
): Promise<Record<string, PropertyCover>> {
  if (ids.length === 0) return {}
  const supabase = createAdminClient()
  const [setByProp, metaByProp] = await Promise.all([
    getSetIdsByPropertyIds(supabase, ids),
    getImageMetaByPropertyIds(ids),
  ])

  const namesBySet = new Map<number, string[]>()
  await Promise.all(
    [...new Set(setByProp.values())].map(async (setId) => {
      namesBySet.set(setId, await listSetImages(supabase, setId))
    })
  )

  const map: Record<string, PropertyCover> = {}
  for (const [propId, setId] of setByProp) {
    const meta = metaByProp.get(propId)
    const names = orderNames(namesBySet.get(setId) ?? [], meta)
    if (names.length === 0) continue
    const isVisible = (n: string) => meta?.get(n)?.visible !== false
    const coverName = names.find(isVisible) ?? names[0]
    map[propId] = {
      url: imageUrl(supabase, setId, coverName, 'thumb'),
      fullUrl: imageUrl(supabase, setId, coverName, 'full'),
      count: names.length,
      hidden: names.filter((n) => !isVisible(n)).length,
    }
  }
  return map
}

/** Módulo PDF: solo la URL de portada (versión web), keyed por id. */
export async function getInventarioImagesByIds(
  ids: string[]
): Promise<Record<string, string>> {
  const covers = await getInventarioCoversByIds(ids)
  return Object.fromEntries(Object.entries(covers).map(([id, c]) => [id, c.fullUrl]))
}

/** Todas las fotos del set de una propiedad, en su orden, con visibilidad en la web. */
export async function getPropertyImages(propertyId: string): Promise<PropertyImageSet> {
  const supabase = createAdminClient()
  const [setByProp, metaByProp] = await Promise.all([
    getSetIdsByPropertyIds(supabase, [propertyId]),
    getImageMetaByPropertyIds([propertyId]),
  ])
  const setId = setByProp.get(propertyId) ?? null
  if (setId === null) return { propertyId, setId: null, images: [] }

  const meta = metaByProp.get(propertyId)
  const names = orderNames(await listSetImages(supabase, setId), meta)
  const images: PropertyImage[] = names.map((name) => ({
    name,
    thumbUrl: imageUrl(supabase, setId, name, 'thumb'),
    url: imageUrl(supabase, setId, name, 'full'),
    visible: meta?.get(name)?.visible !== false,
  }))
  return { propertyId, setId, images }
}

/** Nombres de archivo del set de la propiedad (null si no tiene set): valida escrituras. */
export async function getPropertyImageNames(propertyId: string): Promise<string[] | null> {
  const supabase = createAdminClient()
  const setId = (await getSetIdsByPropertyIds(supabase, [propertyId])).get(propertyId)
  if (setId === undefined) return null
  return listSetImages(supabase, setId)
}
