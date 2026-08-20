import { NextRequest, NextResponse } from 'next/server'
import * as webhookService from '@/lib/services/webhook-service'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('webhooks.manage')
  if (isAuthError(auth)) return auth

  const { id } = await params
  const result = await webhookService.testWebhook(id)
  return NextResponse.json(result)
}
