import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/roles'
import { diffFields, logAudit } from '@/lib/services/audit-service'
import { ALL_PERMISSIONS } from '@/types/roles'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { error: 'Forbidden', status: 403 }
  return { user }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  try {
    const { display_name, description, permissions } = await request.json()
    const before = await dal.getRoleById(id)
    const role = await dal.updateRole(id, display_name, description ?? null, permissions ?? {})
    if (before) {
      const changes = diffFields(
        { Nombre: before.display_name, Descripción: before.description },
        { Nombre: display_name, Descripción: description ?? null }
      )
      const beforePerms = before.permissions ?? {}
      const afterPerms = (permissions ?? {}) as Record<string, boolean>
      for (const key of new Set([...Object.keys(beforePerms), ...Object.keys(afterPerms)])) {
        const antes = beforePerms[key] === true
        const despues = afterPerms[key] === true
        if (antes !== despues) {
          changes[`Permiso: ${ALL_PERMISSIONS[key] ?? key}`] = { antes, despues }
        }
      }
      if (Object.keys(changes).length > 0) {
        await logAudit({
          actorId: auth.user.id,
          action: 'update',
          entity: 'rol',
          entityId: id,
          entityLabel: role.display_name,
          changes,
        })
      }
    }
    return NextResponse.json({ data: role })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  try {
    const before = await dal.getRoleById(id)
    await dal.deleteRole(id)
    await logAudit({
      actorId: auth.user.id,
      action: 'delete',
      entity: 'rol',
      entityId: id,
      entityLabel: before?.display_name ?? id,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
