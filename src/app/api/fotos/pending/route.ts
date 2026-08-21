import { NextRequest, NextResponse } from 'next/server'
import { requireAnyPermission, isAuthError } from '@/lib/auth/permissions'
import { detectPending, listPending } from '@/lib/services/photo-sync/sync'

export const dynamic = 'force-dynamic'

/**
 * Sets de fotos pendientes de importar. Con `?detect=1` revisa antes el
 * inventario (carpetas de Drive nuevas, propiedades sin mapear) — solo BD.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyPermission(['propiedades.view', 'pdf.view'])
  if (isAuthError(auth)) return auth

  try {
    const detect = request.nextUrl.searchParams.get('detect') === '1'
    const data = detect ? await detectPending() : await listPending()
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al revisar fotos pendientes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
