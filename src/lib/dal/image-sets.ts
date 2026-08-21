import { createAdminClient } from '@/lib/supabase/admin'
import type { ImageSetRow, ImageSetStatus, SyncProgress } from '@/types/inventario'

// image_sets: una fila por carpeta de Drive = set (número de carpeta en el
// bucket). propiedad_image_sets: qué set usa cada propiedad (PK propiedad_id).
const IMAGE_SETS = 'image_sets'
const MAPPINGS = 'propiedad_image_sets'
const INVENTARIO = 'inventario_industrial'
const LINK_COLUMN = 'links_imagenes_carpetas_drive'

export interface PropertyLink {
  id: string
  parque: string | null
  link: string | null
}

export async function getImageSet(setId: number): Promise<ImageSetRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from(IMAGE_SETS).select('*').eq('id', setId).maybeSingle()
  if (error) throw new Error(`image_sets: ${error.message}`)
  return (data as ImageSetRow | null) ?? null
}

export async function getAllImageSets(): Promise<ImageSetRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from(IMAGE_SETS).select('*').order('id')
  if (error) throw new Error(`image_sets: ${error.message}`)
  return (data ?? []) as ImageSetRow[]
}

export async function getImageSetsByStatus(statuses: ImageSetStatus[]): Promise<ImageSetRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from(IMAGE_SETS).select('*').in('status', statuses).order('id')
  if (error) throw new Error(`image_sets: ${error.message}`)
  return (data ?? []) as ImageSetRow[]
}

export async function upsertImageSet(row: Partial<ImageSetRow> & { id: number; drive_folder_id: string }): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from(IMAGE_SETS)
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw new Error(`image_sets upsert ${row.id}: ${error.message}`)
}

export async function updateImageSet(
  setId: number,
  patch: Partial<Pick<ImageSetRow, 'status' | 'progress' | 'last_synced_at' | 'last_error' | 'drive_title'>> & {
    progress?: SyncProgress | null
  }
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from(IMAGE_SETS)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', setId)
  if (error) throw new Error(`image_sets update ${setId}: ${error.message}`)
}

/** Siguiente número de set libre (tabla image_sets y mapeos existentes). */
export async function nextFreeSetId(): Promise<number> {
  const supabase = createAdminClient()
  const [a, b] = await Promise.all([
    supabase.from(IMAGE_SETS).select('id').order('id', { ascending: false }).limit(1),
    supabase.from(MAPPINGS).select('image_set_id').order('image_set_id', { ascending: false }).limit(1),
  ])
  const maxA = Number(a.data?.[0]?.id ?? 0)
  const maxB = Number(b.data?.[0]?.image_set_id ?? 0)
  return Math.max(maxA, maxB, 0) + 1
}

/** Todas las propiedades con su link de Drive (paginado de 1000). */
export async function getPropertyLinks(): Promise<PropertyLink[]> {
  const supabase = createAdminClient()
  const rows: PropertyLink[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(INVENTARIO)
      .select(`id, parque, ${LINK_COLUMN}`)
      .range(from, from + 999)
    if (error) throw new Error(`${INVENTARIO}: ${error.message}`)
    const page = (data ?? []) as unknown as Array<Record<string, unknown>>
    for (const r of page) {
      rows.push({ id: String(r.id), parque: (r.parque as string | null) ?? null, link: (r[LINK_COLUMN] as string | null) ?? null })
    }
    if (page.length < 1000) break
  }
  return rows
}

export async function getPropertyLink(propertyId: string): Promise<PropertyLink | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(INVENTARIO)
    .select(`id, parque, ${LINK_COLUMN}`)
    .eq('id', propertyId)
    .maybeSingle()
  if (error) throw new Error(`${INVENTARIO}: ${error.message}`)
  if (!data) return null
  const r = data as unknown as Record<string, unknown>
  return { id: String(r.id), parque: (r.parque as string | null) ?? null, link: (r[LINK_COLUMN] as string | null) ?? null }
}

/** propiedad_id → set actual, para todas las propiedades mapeadas. */
export async function getMappings(): Promise<Map<string, number>> {
  const supabase = createAdminClient()
  const map = new Map<string, number>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(MAPPINGS).select('propiedad_id, image_set_id').range(from, from + 999)
    if (error) throw new Error(`${MAPPINGS}: ${error.message}`)
    for (const r of data ?? []) map.set(String(r.propiedad_id), Number(r.image_set_id))
    if ((data ?? []).length < 1000) break
  }
  return map
}

export async function mapProperties(propertyIds: string[], setId: number): Promise<void> {
  if (propertyIds.length === 0) return
  const supabase = createAdminClient()
  const { error } = await supabase
    .from(MAPPINGS)
    .upsert(propertyIds.map((propiedad_id) => ({ propiedad_id, image_set_id: setId })), { onConflict: 'propiedad_id' })
  if (error) throw new Error(`${MAPPINGS} upsert: ${error.message}`)
}
