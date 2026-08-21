import { createAdminClient } from '@/lib/supabase/admin'
import type { Property } from '@/types'
import type { InventarioListItem } from '@/types/inventario'
import { invalidateFilterOptionsCache, resolveColumnVariants } from '@/lib/dal/filter-options'
import {
  INVENTARIO_TABLE,
  KEY_TO_COLUMN,
  SEARCH_COLUMNS,
  mapInventarioRow,
} from '@/lib/utils/inventario'

interface PropertyFilters {
  alcaldia?: string
  colonia?: string
  disponibilidad?: string
  tipo_preventa?: string
  tipo_entrega?: string
  precio_min?: number
  precio_max?: number
  recamaras_min?: number
  search?: string
}

interface PaginatedResult {
  data: Property[]
  nextCursor: string | null
}

export async function getProperties(
  filters: PropertyFilters = {},
  cursor?: string,
  perPage = 20
): Promise<PaginatedResult> {
  // inventario_industrial tiene RLS sin políticas (tabla del sistema
  // Laravel); se lee con service role. Los callers verifican sesión.
  const supabase = createAdminClient()

  let query = supabase
    .from(INVENTARIO_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(perPage + 1)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  // Filtros de catálogo: un valor → todas sus variantes de mayúsculas/acentos en BD
  const selectFilters = ['alcaldia', 'colonia', 'disponibilidad', 'tipo_preventa', 'tipo_entrega'] as const
  for (const key of selectFilters) {
    const value = filters[key]
    if (value) {
      query = query.in(KEY_TO_COLUMN[key], await resolveColumnVariants(KEY_TO_COLUMN[key], value))
    }
  }
  if (filters.precio_min) {
    query = query.gte(KEY_TO_COLUMN.precio_unidad, filters.precio_min)
  }
  if (filters.precio_max) {
    query = query.lte(KEY_TO_COLUMN.precio_unidad, filters.precio_max)
  }
  if (filters.search) {
    const conditions = SEARCH_COLUMNS.map(
      (c) => `${c}.ilike.%${filters.search}%`
    ).join(',')
    query = query.or(conditions)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching properties:', error.message)
    return { data: [], nextCursor: null }
  }

  const properties = (data ?? []).map(mapInventarioRow) as unknown as Property[]
  const hasMore = properties.length > perPage
  if (hasMore) properties.pop()

  return {
    data: properties,
    nextCursor: hasMore
      ? properties[properties.length - 1].created_at
      : null,
  }
}

export async function getPropertyById(
  id: string
): Promise<Property | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(INVENTARIO_TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching property:', error.message)
    return null
  }

  return mapInventarioRow(data) as unknown as Property
}

// Las opciones de filtro (valores normalizados) viven en lib/dal/filter-options.ts

const LIST_COLUMNS =
  'id, parque, unidad, zona_corredor, municipio, estado, ubicacion, producto, tipo_producto, operacion, precio_total_venta, renta_mensual'
const LIST_PAGE = 1000

function strOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

/**
 * Inventario completo en versión ligera (12 columnas) para selectores con
 * búsqueda en el cliente. Se trae en bloques de 1000 y se ordena por
 * parque y unidad (numérica: "2" antes que "10").
 */
export async function getInventarioList(): Promise<InventarioListItem[]> {
  const supabase = createAdminClient()
  const items: InventarioListItem[] = []
  for (let offset = 0; ; offset += LIST_PAGE) {
    const { data, error } = await supabase
      .from(INVENTARIO_TABLE)
      .select(LIST_COLUMNS)
      .order('id')
      .range(offset, offset + LIST_PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    for (const r of rows) {
      items.push({
        id: String(r.id),
        parque: strOrNull(r.parque),
        unidad: strOrNull(r.unidad),
        zona_corredor: strOrNull(r.zona_corredor),
        municipio: strOrNull(r.municipio),
        estado: strOrNull(r.estado),
        ubicacion: strOrNull(r.ubicacion),
        producto: strOrNull(r.producto),
        tipo_producto: strOrNull(r.tipo_producto),
        operacion: strOrNull(r.operacion),
        precio_total_venta: numOrNull(r.precio_total_venta),
        renta_mensual: numOrNull(r.renta_mensual),
      })
    }
    if (rows.length < LIST_PAGE) break
  }
  return items.sort(
    (a, b) =>
      (a.parque ?? '').localeCompare(b.parque ?? '', 'es', { sensitivity: 'base' }) ||
      (a.unidad ?? '').localeCompare(b.unidad ?? '', 'es', { numeric: true })
  )
}

export async function insertProperty(
  dbData: Record<string, unknown>
): Promise<Property> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(INVENTARIO_TABLE)
    .insert(dbData)
    .select()
    .single()

  if (error) {
    console.error('Error inserting property:', error.message)
    throw new Error(error.message)
  }

  invalidateFilterOptionsCache()
  return mapInventarioRow(data) as unknown as Property
}

export async function updateProperty(
  id: string,
  dbData: Record<string, unknown>
): Promise<Property> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(INVENTARIO_TABLE)
    .update(dbData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating property:', error.message)
    throw new Error(error.message)
  }

  invalidateFilterOptionsCache()
  return mapInventarioRow(data) as unknown as Property
}

export async function deleteProperty(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from(INVENTARIO_TABLE)
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting property:', error.message)
    throw new Error(error.message)
  }
  invalidateFilterOptionsCache()
}
