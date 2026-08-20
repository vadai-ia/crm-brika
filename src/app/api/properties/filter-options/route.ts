import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getFilterOptions } from '@/lib/dal/filter-options'

/**
 * Opciones para los selects de filtros de Propiedades. Cada opción representa
 * TODAS las variantes de mayúsculas/acentos que existen en la BD (ver
 * lib/dal/filter-options.ts); al filtrar con ella se traen todas.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Lectura con service role dentro del DAL: inventario_industrial tiene RLS
    // sin políticas (tabla del sistema Laravel). La sesión ya fue verificada.
    const options = await getFilterOptions()
    const response = NextResponse.json(options)
    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60')
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error loading filter options'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
