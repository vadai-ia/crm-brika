import { createAdminClient } from '@/lib/supabase/admin'
import type { Desarrollo } from '@/types/desarrollo'
import { mapDesarrolloToDB } from '@/lib/validations/desarrollo'

interface DesarrolloFilters {
  colonia?: string
  alcaldia?: string
  disponibilidad?: string
  tipo_preventa?: string
  tipo_entrega?: string
  bodega?: string
  search?: string
  precio_min?: number
  precio_max?: number
  m2_totales_min?: number
  m2_totales_max?: number
  recamaras_min?: number
  recamaras_max?: number
  banos_min?: number
  banos_max?: number
  estacionamientos_min?: number
  estacionamientos_max?: number
}

interface PaginatedResult {
  data: Desarrollo[]
  nextCursor: string | null
}

export async function getDesarrollos(
  filters: DesarrolloFilters = {},
  cursor?: string,
  perPage = 20
): Promise<PaginatedResult> {
  const supabase = createAdminClient()

  let query = supabase
    .from('desarrollos_view')
    .select('*')
    .order('id', { ascending: false })
    .limit(perPage + 1)

  if (cursor) {
    query = query.lt('id', cursor)
  }

  if (filters.colonia) query = query.eq('colonia', filters.colonia)
  if (filters.alcaldia) query = query.eq('alcaldia', filters.alcaldia)
  if (filters.disponibilidad) query = query.eq('disponibilidad', filters.disponibilidad)
  if (filters.tipo_preventa) query = query.eq('tipo_preventa', filters.tipo_preventa)
  if (filters.tipo_entrega) query = query.eq('tipo_entrega', filters.tipo_entrega)
  if (filters.bodega) query = query.eq('bodega', filters.bodega)

  // Range intersection: filter's [min,max] must overlap desarrollo's [col_min,col_max].
  // - filter.min set → desarrollo.col_max >= filter.min OR col_max IS NULL
  // - filter.max set → desarrollo.col_min <= filter.max OR col_min IS NULL
  // NULL bounds (e.g. Tajín III with precio_min NULL, precio_max 5.7M) are
  // treated as open-ended and should match any filter on that side.
  const rangePairs: Array<[string, string, number | undefined, number | undefined]> = [
    ['precio_min', 'precio_max', filters.precio_min, filters.precio_max],
    ['m2_totales_min', 'm2_totales_max', filters.m2_totales_min, filters.m2_totales_max],
    ['recamaras_min', 'recamaras_max', filters.recamaras_min, filters.recamaras_max],
    ['banos_min', 'banos_max', filters.banos_min, filters.banos_max],
    ['estacionamientos_min', 'estacionamientos_max', filters.estacionamientos_min, filters.estacionamientos_max],
  ]
  for (const [colMin, colMax, fMin, fMax] of rangePairs) {
    if (fMin !== undefined && !isNaN(fMin)) {
      query = query.or(`${colMax}.gte.${fMin},${colMax}.is.null`)
    }
    if (fMax !== undefined && !isNaN(fMax)) {
      query = query.or(`${colMin}.lte.${fMax},${colMin}.is.null`)
    }
  }

  if (filters.search) {
    query = query.or(
      `nombre_kibah.ilike.%${filters.search}%,colonia.ilike.%${filters.search}%,alcaldia.ilike.%${filters.search}%,nombre_desarrollador.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching desarrollos:', error.message)
    return { data: [], nextCursor: null }
  }

  const items = (data ?? []) as Desarrollo[]
  const hasMore = items.length > perPage
  if (hasMore) items.pop()

  return {
    data: items,
    nextCursor: hasMore && items.length > 0 ? String(items[items.length - 1].id) : null,
  }
}

export async function getDesarrolloById(id: number): Promise<Desarrollo | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('desarrollos_view')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Desarrollo
}

export async function getDesarrolloFilterOptions() {
  const supabase = createAdminClient()

  const [colonias, alcaldias, disponibilidades, tipos_preventa, tipos_entrega, nombres_kibah] = await Promise.all([
    supabase.from('desarrollos_view').select('colonia').not('colonia', 'is', null),
    supabase.from('desarrollos_view').select('alcaldia').not('alcaldia', 'is', null),
    supabase.from('desarrollos_view').select('disponibilidad').not('disponibilidad', 'is', null),
    supabase.from('desarrollos_view').select('tipo_preventa').not('tipo_preventa', 'is', null),
    supabase.from('desarrollos_view').select('tipo_entrega').not('tipo_entrega', 'is', null),
    supabase.from('desarrollos_view').select('nombre_kibah').not('nombre_kibah', 'is', null),
  ])

  return {
    colonias: [...new Set((colonias.data ?? []).map((r) => r.colonia as string).filter(Boolean))].sort(),
    alcaldias: [...new Set((alcaldias.data ?? []).map((r) => r.alcaldia as string).filter(Boolean))].sort(),
    disponibilidades: [...new Set((disponibilidades.data ?? []).map((r) => r.disponibilidad as string).filter(Boolean))].sort(),
    tipos_preventa: [...new Set((tipos_preventa.data ?? []).map((r) => r.tipo_preventa as string).filter(Boolean))].sort(),
    tipos_entrega: [...new Set((tipos_entrega.data ?? []).map((r) => r.tipo_entrega as string).filter(Boolean))].sort(),
    nombres_kibah: [...new Set((nombres_kibah.data ?? []).map((r) => r.nombre_kibah as string).filter(Boolean))].sort(),
  }
}

export async function insertDesarrollo(data: Record<string, unknown>): Promise<Desarrollo> {
  const supabase = createAdminClient()
  const dbData = mapDesarrolloToDB(data)
  const { data: row, error } = await supabase
    .from('pagina_web_kibah')
    .insert(dbData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return row as Desarrollo
}

export async function updateDesarrollo(id: number, data: Record<string, unknown>): Promise<Desarrollo> {
  const supabase = createAdminClient()
  const dbData = mapDesarrolloToDB(data)
  const { data: row, error } = await supabase
    .from('pagina_web_kibah')
    .update(dbData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return row as Desarrollo
}

export async function deleteDesarrollo(id: number): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('pagina_web_kibah')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function getDesarrolloImagesByNombresKibah(
  nombres: string[]
): Promise<Record<string, string>> {
  if (nombres.length === 0) return {}
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('desarrollos_view')
    .select('nombre_kibah, imagen_principal')
    .in('nombre_kibah', nombres)
    .not('imagen_principal', 'is', null)

  if (error) {
    console.error('Error fetching desarrollo images:', error.message)
    return {}
  }

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    if (row.nombre_kibah && row.imagen_principal) {
      map[row.nombre_kibah as string] = row.imagen_principal as string
    }
  }
  return map
}
