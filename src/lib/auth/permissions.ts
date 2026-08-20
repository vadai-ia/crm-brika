import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserPermissions } from '@/lib/dal/roles'

export interface AuthOk {
  userId: string
  isAdmin: boolean
}

export type AuthResult = AuthOk | NextResponse

export function isAuthError(result: AuthResult): result is NextResponse {
  return result instanceof NextResponse
}

export async function requirePermission(permission: string): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const perms = await getUserPermissions(user.id)
  const isAdmin = perms._isAdmin === true
  if (!isAdmin && !perms[permission]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { userId: user.id, isAdmin }
}

export async function requireAnyPermission(permissions: string[]): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const perms = await getUserPermissions(user.id)
  const isAdmin = perms._isAdmin === true
  if (!isAdmin && !permissions.some((p) => perms[p])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { userId: user.id, isAdmin }
}

export async function requireAdmin(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const perms = await getUserPermissions(user.id)
  if (!perms._isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { userId: user.id, isAdmin: true }
}

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const perms = await getUserPermissions(user.id)
  return { userId: user.id, isAdmin: perms._isAdmin === true }
}
