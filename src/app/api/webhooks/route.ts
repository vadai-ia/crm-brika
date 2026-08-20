import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createWebhookSchema } from '@/lib/validations/webhook'
import * as dal from '@/lib/dal/webhooks'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

export async function GET() {
  const auth = await requirePermission('webhooks.view')
  if (isAuthError(auth)) return auth

  try {
    const webhooks = await dal.getWebhooks()
    return NextResponse.json({ data: webhooks })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching webhooks'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('webhooks.manage')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const validated = createWebhookSchema.parse(body)
    const webhook = await dal.createWebhook(validated, auth.userId)
    return NextResponse.json({ data: webhook }, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error creating webhook'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
