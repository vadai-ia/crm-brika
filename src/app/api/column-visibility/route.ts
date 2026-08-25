import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { getColumnVisibility, updateColumnVisibility } from '@/lib/dal/column-visibility'
import { logAudit } from '@/lib/services/audit-service'
import type { AuditChange } from '@/types/audit'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('column_visibility')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching column visibility:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

const FILTER_TYPES = ['range', 'select', 'text', 'boolean', 'none'] as const

const columnUpdateSchema = z.object({
  id: z.string().uuid(),
  visible_to_asesores: z.boolean(),
  display_label: z.string().min(1),
  display_order: z.number().int().nonnegative(),
  filter_type: z.enum(FILTER_TYPES),
})

const updatePayloadSchema = z.array(columnUpdateSchema).min(1)

export async function PUT(request: NextRequest) {
  const { requirePermission, isAuthError } = await import('@/lib/auth/permissions')
  const auth = await requirePermission('columnas.edit')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const updates = updatePayloadSchema.parse(body)

    const before = await getColumnVisibility().catch(() => [])
    await updateColumnVisibility(updates)

    const byId = new Map(before.map((c) => [c.id, c]))
    const changes: Record<string, AuditChange> = {}
    for (const u of updates) {
      const prev = byId.get(u.id)
      if (!prev) continue
      const col = prev.display_label || prev.column_name
      if (prev.visible_to_asesores !== u.visible_to_asesores) {
        changes[`${col} · visible para asesores`] = {
          antes: prev.visible_to_asesores,
          despues: u.visible_to_asesores,
        }
      }
      if ((prev.display_label ?? '') !== u.display_label) {
        changes[`${col} · etiqueta`] = { antes: prev.display_label, despues: u.display_label }
      }
      if (prev.display_order !== u.display_order) {
        changes[`${col} · orden`] = { antes: prev.display_order, despues: u.display_order }
      }
      if ((prev.filter_type ?? 'none') !== u.filter_type) {
        changes[`${col} · filtro`] = { antes: prev.filter_type, despues: u.filter_type }
      }
    }
    if (Object.keys(changes).length > 0) {
      await logAudit({
        actorId: auth.userId,
        action: 'update',
        entity: 'columnas',
        entityLabel: 'Configuración de columnas',
        changes,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error updating columns'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
