import { createAdminClient } from '@/lib/supabase/admin'

export const IMAGE_VISIBILITY_TABLE = 'propiedad_imagenes_visibilidad'

// Visibilidad y orden de fotos por propiedad para la página web. Tabla con PK
// (propiedad_id, image_name). Reglas: SIN FILA = VISIBLE y sin orden (va al
// final, en orden natural); `orden` 0..n define el acomodo y la #1 visible es
// la portada (CRM y web). Se escribe solo desde el CRM con service role.

export interface ImageMeta {
  visible: boolean
  orden: number | null
}

/** propiedad_id → (nombre de archivo → visible/orden), solo las filas que existen. */
export async function getImageMetaByPropertyIds(
  ids: string[]
): Promise<Map<string, Map<string, ImageMeta>>> {
  const result = new Map<string, Map<string, ImageMeta>>()
  if (ids.length === 0) return result

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(IMAGE_VISIBILITY_TABLE)
    .select('propiedad_id, image_name, visible, orden')
    .in('propiedad_id', ids)
  if (error) {
    console.error('Error fetching image visibility:', error.message)
    throw new Error(error.message)
  }

  for (const row of data ?? []) {
    const id = String(row.propiedad_id)
    let byName = result.get(id)
    if (!byName) {
      byName = new Map<string, ImageMeta>()
      result.set(id, byName)
    }
    byName.set(String(row.image_name), {
      visible: row.visible !== false,
      orden: row.orden === null || row.orden === undefined ? null : Number(row.orden),
    })
  }
  return result
}

/** Acomoda los nombres: primero los que tienen `orden` (ascendente), luego el resto en su orden natural. */
export function orderNames(names: string[], meta: Map<string, ImageMeta> | undefined): string[] {
  if (!meta) return names
  const ordered = names
    .filter((n) => meta.get(n)?.orden != null)
    .sort((a, b) => (meta.get(a)!.orden as number) - (meta.get(b)!.orden as number))
  const rest = names.filter((n) => meta.get(n)?.orden == null)
  return [...ordered, ...rest]
}

/** Marca visibles u ocultas varias fotos de una propiedad (upsert por PK; no toca `orden`). */
export async function setImagesVisibility(
  propertyId: string,
  names: string[],
  visible: boolean,
  userId: string | null
): Promise<void> {
  if (names.length === 0) return
  const supabase = createAdminClient()
  // updated_at va explícito: el default solo aplica al insertar, no en el conflicto.
  const now = new Date().toISOString()
  const rows = names.map((name) => ({
    propiedad_id: propertyId,
    image_name: name,
    visible,
    updated_at: now,
    updated_by: userId,
  }))
  const { error } = await supabase
    .from(IMAGE_VISIBILITY_TABLE)
    .upsert(rows, { onConflict: 'propiedad_id,image_name' })
  if (error) {
    console.error('Error saving image visibility:', error.message)
    throw new Error(error.message)
  }
}

/** Guarda el orden completo de las fotos de una propiedad (posición = índice; no toca `visible`). */
export async function setImagesOrder(
  propertyId: string,
  names: string[],
  userId: string | null
): Promise<void> {
  if (names.length === 0) return
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const rows = names.map((name, orden) => ({
    propiedad_id: propertyId,
    image_name: name,
    orden,
    updated_at: now,
    updated_by: userId,
  }))
  const { error } = await supabase
    .from(IMAGE_VISIBILITY_TABLE)
    .upsert(rows, { onConflict: 'propiedad_id,image_name' })
  if (error) {
    console.error('Error saving image order:', error.message)
    throw new Error(error.message)
  }

  // Las fotos que no vienen en la lista pierden su posición (quedan al final,
  // en orden natural): así un orden parcial nunca deja posiciones viejas.
  const { data: existing } = await supabase
    .from(IMAGE_VISIBILITY_TABLE)
    .select('image_name')
    .eq('propiedad_id', propertyId)
    .not('orden', 'is', null)
  const stale = (existing ?? []).map((r) => String(r.image_name)).filter((n) => !names.includes(n))
  if (stale.length > 0) {
    const { error: clearError } = await supabase
      .from(IMAGE_VISIBILITY_TABLE)
      .update({ orden: null, updated_at: now, updated_by: userId })
      .eq('propiedad_id', propertyId)
      .in('image_name', stale)
    if (clearError) throw new Error(clearError.message)
  }
}
