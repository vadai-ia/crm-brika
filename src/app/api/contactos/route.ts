import { withTechLog } from '@/lib/services/tech-log'
import { NextResponse } from 'next/server'
import { getContactosInventario } from '@/lib/dal/contactos'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

async function _GET() {
  const auth = await requirePermission('contactos.view')
  if (isAuthError(auth)) return auth

  try {
    const data = await getContactosInventario()
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/contactos', _GET)
