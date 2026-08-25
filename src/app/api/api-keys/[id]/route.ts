import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/api-keys'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/services/audit-service'

async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('apikeys.manage')
  if (isAuthError(auth)) return auth

  const { id } = await params

  try {
    const before = await dal.getApiKeyById(id)
    await dal.revokeApiKey(id)
    await logAudit({
      actorId: auth.userId,
      action: 'delete',
      entity: 'api_key',
      entityId: id,
      entityLabel: before?.name ?? id,
      metadata: { tipo: 'revocación' },
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error revoking API key'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const DELETE = withTechLog('/api/api-keys/[id]', _DELETE)
