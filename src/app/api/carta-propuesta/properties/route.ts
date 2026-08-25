import { withTechLog } from '@/lib/services/tech-log'
import { NextResponse } from 'next/server'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { getInventarioList } from '@/lib/dal/properties'

/** Propiedades del inventario (versión ligera) para el selector de la Carta Propuesta. */
async function _GET() {
  const auth = await requirePermission('carta_propuesta.view')
  if (isAuthError(auth)) return auth

  try {
    // inventario_industrial tiene RLS sin políticas (la administra Laravel):
    // el DAL lee con el cliente admin después de verificar la sesión (ERROR-JOURNAL #6)
    const items = await getInventarioList()
    return NextResponse.json({ data: items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error loading properties'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/carta-propuesta/properties', _GET)
