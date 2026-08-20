import { NextResponse } from 'next/server'
import { getConnectedUsersWithProfiles } from '@/lib/dal/google-tokens'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

export async function GET() {
  const auth = await requirePermission('asesores.view')
  if (isAuthError(auth)) return auth

  try {
    const users = await getConnectedUsersWithProfiles(
      auth.isAdmin ? undefined : { excludeRoles: ['admin'] }
    )
    return NextResponse.json({ data: users, adminUserId: auth.userId })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
