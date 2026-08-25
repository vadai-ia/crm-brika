import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { updateDesarrolloSchema } from '@/lib/validations/desarrollo'
import * as dal from '@/lib/dal/desarrollos'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { diffFields, logAudit } from '@/lib/services/audit-service'

async function _PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('desarrollos.edit')
  if (isAuthError(auth)) return auth

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const body = await request.json()
    const validated = updateDesarrolloSchema.parse(body)
    const before = await dal.getDesarrolloById(numId)
    const desarrollo = await dal.updateDesarrollo(numId, validated as Record<string, unknown>)
    const changes = diffFields(
      (before ?? {}) as unknown as Record<string, unknown>,
      validated as Record<string, unknown>
    )
    if (Object.keys(changes).length > 0) {
      await logAudit({
        actorId: auth.userId,
        action: 'update',
        entity: 'desarrollo',
        entityId: String(numId),
        entityLabel:
          before?.nombre_kibah ?? before?.nombre_desarrollador ?? String(numId),
        changes,
      })
    }
    return NextResponse.json({ data: desarrollo })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Error updating desarrollo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('desarrollos.delete')
  if (isAuthError(auth)) return auth

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const before = await dal.getDesarrolloById(numId)
    await dal.deleteDesarrollo(numId)
    await logAudit({
      actorId: auth.userId,
      action: 'delete',
      entity: 'desarrollo',
      entityId: String(numId),
      entityLabel: before?.nombre_kibah ?? before?.nombre_desarrollador ?? String(numId),
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error deleting desarrollo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const PUT = withTechLog('/api/desarrollos/[id]', _PUT)
export const DELETE = withTechLog('/api/desarrollos/[id]', _DELETE)
