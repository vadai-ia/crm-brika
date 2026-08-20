import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { updateColumnVisibility } from '@/lib/dal/column-visibility'

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

    await updateColumnVisibility(updates)

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
