import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/event-categories'

async function _PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const { name, color } = await request.json()
    const category = await dal.updateCategory(id, name, color)
    return NextResponse.json({ data: category })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await dal.deleteCategory(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const PUT = withTechLog('/api/calendar/categories/[id]', _PUT)
export const DELETE = withTechLog('/api/calendar/categories/[id]', _DELETE)
