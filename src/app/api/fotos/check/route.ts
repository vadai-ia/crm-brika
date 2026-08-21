import { NextResponse } from 'next/server'
import { requireAnyPermission, isAuthError } from '@/lib/auth/permissions'
import { checkStaleSets } from '@/lib/services/photo-sync/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SETS_PER_CALL = 8

/**
 * Revisión de cambios en Drive para sets ya importados (máx. 8 por llamada,
 * solo los que no se han revisado en 24 h). La dispara el cliente al abrir
 * Propiedades después de importar lo pendiente; sustituye a un cron.
 */
export async function POST() {
  const auth = await requireAnyPermission(['propiedades.view', 'pdf.view'])
  if (isAuthError(auth)) return auth

  try {
    const data = await checkStaleSets(SETS_PER_CALL)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al revisar cambios en Drive'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
