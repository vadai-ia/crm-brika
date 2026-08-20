import { NextResponse } from 'next/server'
import { getDesarrolloFilterOptions } from '@/lib/dal/desarrollos'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

export async function GET() {
  const auth = await requirePermission('desarrollos.view')
  if (isAuthError(auth)) return auth

  try {
    const options = await getDesarrolloFilterOptions()
    return NextResponse.json(options)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
