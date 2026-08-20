import { createAdminClient } from '@/lib/supabase/admin'
import { INVENTARIO_TABLE, KEY_TO_COLUMN } from '@/lib/utils/inventario'
import { groupVariants, normalizeKey, type VariantGroup } from '@/lib/utils/normalize'

// Opciones de filtro de Propiedades con valores normalizados: el usuario ve
// una sola opción por texto ("Colón") y al filtrar se buscan TODAS las
// variantes que hay en la BD ("Colon", "colón", "Colón "…) con `.in()`.
// Sin extensiones de Postgres ni cambios de esquema.

const PAGE_SIZE = 1000
const CACHE_TTL_MS = 60_000

/** Clave de respuesta del endpoint → columna real de inventario_industrial. */
export const FILTER_OPTION_FIELDS = {
  colonias: KEY_TO_COLUMN.colonia,
  alcaldias: KEY_TO_COLUMN.alcaldia,
  disponibilidades: KEY_TO_COLUMN.disponibilidad,
  tipos_preventa: KEY_TO_COLUMN.tipo_preventa,
  tipos_entrega: KEY_TO_COLUMN.tipo_entrega,
} as const

export type FilterOptions = Record<keyof typeof FILTER_OPTION_FIELDS, string[]>

const cache = new Map<string, { at: number; groups: VariantGroup[] }>()

/** Todos los valores crudos de una columna (con repeticiones: sirven para elegir la etiqueta más usada). */
async function fetchColumnValues(column: string): Promise<string[]> {
  const supabase = createAdminClient()
  const values: string[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(INVENTARIO_TABLE)
      .select(column)
      .not(column, 'is', null)
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    for (const row of rows) {
      const v = row[column]
      if (v !== null && v !== undefined && String(v).trim() !== '') values.push(String(v))
    }
    if (rows.length < PAGE_SIZE) break
  }
  return values
}

/** Grupos de variantes de una columna (cache de 60 s por instancia). */
export async function getColumnGroups(column: string): Promise<VariantGroup[]> {
  const hit = cache.get(column)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.groups
  const groups = groupVariants(await fetchColumnValues(column))
  cache.set(column, { at: Date.now(), groups })
  return groups
}

/** Olvida el cache (llamar tras altas/ediciones que puedan crear valores nuevos). */
export function invalidateFilterOptionsCache(): void {
  cache.clear()
}

/**
 * Variantes crudas que corresponden al valor pedido, sin importar mayúsculas,
 * acentos ni espacios. Si no hay grupo, se devuelve el valor tal cual.
 */
export async function resolveColumnVariants(column: string, value: string): Promise<string[]> {
  const key = normalizeKey(value)
  if (!key) return [value]
  const group = (await getColumnGroups(column)).find((g) => g.key === key)
  return group ? group.variants : [value]
}

/** Opciones (una etiqueta por texto) para los selects de Propiedades. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const entries = await Promise.all(
    (Object.entries(FILTER_OPTION_FIELDS) as Array<[keyof FilterOptions, string]>).map(
      async ([field, column]) => [field, (await getColumnGroups(column)).map((g) => g.label)] as const
    )
  )
  return Object.fromEntries(entries) as FilterOptions
}
