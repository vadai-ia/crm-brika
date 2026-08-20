import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/event-categories'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const categories = await dal.getCategoriesByUser(user.id)
    return NextResponse.json({ data: categories })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, color } = await request.json()
    if (!name || !color) return NextResponse.json({ error: 'name and color required' }, { status: 400 })
    const category = await dal.createCategory(user.id, name, color)
    return NextResponse.json({ data: category }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    const status = msg.includes('duplicate') || msg.includes('unique') ? 400 : 500
    return NextResponse.json({ error: status === 400 ? 'Ya existe una categoria con ese nombre' : msg }, { status })
  }
}
