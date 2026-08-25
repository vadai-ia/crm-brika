import { withTechLog } from '@/lib/services/tech-log'
import { NextResponse } from 'next/server'
import { getDesarrolloFilterOptions } from '@/lib/dal/desarrollos'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

async function _GET() {
  const auth = await requirePermission('desarrollos.view')
  if (isAuthError(auth)) return auth

  try {
    const options = await getDesarrolloFilterOptions()
    return NextResponse.json(options)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/desarrollos/filter-options', _GET)
