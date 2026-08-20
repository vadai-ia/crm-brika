import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/saved-filters'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await dal.getSavedFilters(user.id)
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const filters = body.filters && typeof body.filters === 'object' ? body.filters : null
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!filters) return NextResponse.json({ error: 'Filtros requeridos' }, { status: 400 })

    const data = await dal.saveFilter(user.id, name, filters)
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    if (msg.toLowerCase().includes('duplicate') || msg.includes('saved_filters_user_id_name_key')) {
      return NextResponse.json({ error: 'Ya existe un filtro con ese nombre' }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
