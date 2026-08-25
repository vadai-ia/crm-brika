import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/leads'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

async function _GET(request: NextRequest) {
  const auth = await requirePermission('formularios.view')
  if (isAuthError(auth)) return auth

  const before = request.nextUrl.searchParams.get('before')

  try {
    const leads = await dal.getLeadsPropiedades(before)
    const nextCursor =
      leads.length === dal.LEADS_PAGE_SIZE ? leads[leads.length - 1].created_at : null
    return NextResponse.json({ data: leads, nextCursor })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/formularios/leads-propiedades', _GET)
