import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { updateWebhookSchema } from '@/lib/validations/webhook'
import * as dal from '@/lib/dal/webhooks'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { diffFields, logAudit, snapshotFields } from '@/lib/services/audit-service'
import type { AuditChange } from '@/types/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('webhooks.manage')
  if (isAuthError(auth)) return auth

  const { id } = await params

  try {
    const body = await request.json()
    const validated = updateWebhookSchema.parse(body)
    const before = await dal.getWebhookById(id)
    const webhook = await dal.updateWebhook(id, validated)
    if (before) {
      const changes: Record<string, AuditChange> = diffFields(
        { Nombre: before.name, URL: before.url, Eventos: before.events, Activo: before.is_active },
        { Nombre: validated.name, URL: validated.url, Eventos: validated.events, Activo: validated.is_active }
      )
      // Los headers pueden traer tokens: solo se registra que cambiaron
      if (
        validated.headers !== undefined &&
        JSON.stringify(before.headers ?? {}) !== JSON.stringify(validated.headers ?? {})
      ) {
        changes['Headers'] = {
          antes: `${Object.keys(before.headers ?? {}).length} encabezado(s)`,
          despues: `${Object.keys(validated.headers ?? {}).length} encabezado(s)`,
        }
      }
      if (Object.keys(changes).length > 0) {
        await logAudit({
          actorId: auth.userId,
          action: 'update',
          entity: 'webhook',
          entityId: id,
          entityLabel: webhook.name,
          changes,
        })
      }
    }
    return NextResponse.json({ data: webhook })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error updating webhook'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('webhooks.manage')
  if (isAuthError(auth)) return auth

  const { id } = await params

  try {
    const before = await dal.getWebhookById(id)
    await dal.deleteWebhook(id)
    await logAudit({
      actorId: auth.userId,
      action: 'delete',
      entity: 'webhook',
      entityId: id,
      entityLabel: before?.name ?? id,
      changes: before
        ? snapshotFields({ Nombre: before.name, URL: before.url, Eventos: before.events }, {}, 'antes')
        : null,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error deleting webhook'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
