import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { updateWebhookSchema } from '@/lib/validations/webhook'
import * as dal from '@/lib/dal/webhooks'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

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
    const webhook = await dal.updateWebhook(id, validated)
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
    await dal.deleteWebhook(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error deleting webhook'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
