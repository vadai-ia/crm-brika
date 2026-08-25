import { withTechLog } from '@/lib/services/tech-log'
import { NextResponse } from 'next/server'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { getInventarioList } from '@/lib/dal/properties'

/**
 * Inventario completo (versión ligera) para el selector de la Ficha Técnica:
 * se carga una sola vez y la búsqueda es en el cliente. La ficha completa de
 * cada propiedad elegida se pide aparte a GET /api/properties/[id].
 */
async function _GET() {
  const auth = await requirePermission('pdf.view')
  if (isAuthError(auth)) return auth

  try {
    const items = await getInventarioList()
    const response = NextResponse.json({ data: items })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error loading properties'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/pdf/properties', _GET)
