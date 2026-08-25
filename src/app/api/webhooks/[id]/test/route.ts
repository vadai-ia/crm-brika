import { NextRequest, NextResponse } from 'next/server'
import * as webhookService from '@/lib/services/webhook-service'
import { getWebhookById } from '@/lib/dal/webhooks'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { logAudit } from '@/lib/services/audit-service'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('webhooks.manage')
  if (isAuthError(auth)) return auth

  const { id } = await params
  const result = await webhookService.testWebhook(id)
  const webhook = await getWebhookById(id)
  await logAudit({
    actorId: auth.userId,
    action: 'test',
    entity: 'webhook',
    entityId: id,
    entityLabel: webhook?.name ?? id,
    metadata: { resultado: result as unknown as Record<string, unknown> },
  })
  return NextResponse.json(result)
}
