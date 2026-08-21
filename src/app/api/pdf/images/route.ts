import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getInventarioImagesByIds } from '@/lib/dal/property-images'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    // ids (uuid) de inventario_industrial; resueltos vía propiedad_image_sets
    const ids: string[] = (body.ids ?? []).map(String).slice(0, 50)
    const images = await getInventarioImagesByIds(ids)
    return NextResponse.json({ images })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
