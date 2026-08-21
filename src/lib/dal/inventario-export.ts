import { createAdminClient } from '@/lib/supabase/admin'
import { INVENTARIO_TABLE } from '@/lib/utils/inventario'

const PAGE = 1000

/**
 * Todas las filas de inventario_industrial (columnas crudas) para exportar,
 * ordenadas por parque y unidad (numérica: "2" antes que "10"). Se trae en
 * bloques de 1000: hoy son ~450 filas (ver regla #18 sobre listas completas).
 */
export async function getInventarioRowsForExport(): Promise<Record<string, unknown>[]> {
  const supabase = createAdminClient()
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(INVENTARIO_TABLE)
      .select('*')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const page = (data ?? []) as Record<string, unknown>[]
    rows.push(...page)
    if (page.length < PAGE) break
  }
  const s = (v: unknown) => String(v ?? '')
  return rows.sort(
    (a, b) =>
      s(a.parque).localeCompare(s(b.parque), 'es', { sensitivity: 'base' }) ||
      s(a.unidad).localeCompare(s(b.unidad), 'es', { numeric: true })
  )
}
