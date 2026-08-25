import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createApiKeySchema } from '@/lib/validations/api-key'
import * as dal from '@/lib/dal/api-keys'
import * as apiKeyService from '@/lib/services/api-key-service'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { logAudit, snapshotFields } from '@/lib/services/audit-service'

export async function GET() {
  const auth = await requirePermission('apikeys.view')
  if (isAuthError(auth)) return auth

  try {
    const keys = await dal.getApiKeys()
    return NextResponse.json({ data: keys })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching API keys'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('apikeys.manage')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const validated = createApiKeySchema.parse(body)
    const result = await apiKeyService.generateApiKey(validated, auth.userId)
    await logAudit({
      actorId: auth.userId,
      action: 'create',
      entity: 'api_key',
      entityId: result.id,
      entityLabel: result.name,
      changes: snapshotFields({
        Nombre: result.name,
        Prefijo: result.key_prefix,
        Permisos: result.permissions,
        Expira: result.expires_at,
      }),
    })
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error creating API key'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
