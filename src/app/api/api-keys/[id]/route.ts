import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/api-keys'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('apikeys.manage')
  if (isAuthError(auth)) return auth

  const { id } = await params

  try {
    await dal.revokeApiKey(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error revoking API key'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
