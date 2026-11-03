import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getInventarioPhotosByIds } from '@/lib/dal/property-images'

async function _POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    // ids (uuid) de inventario_industrial; resueltos vía propiedad_image_sets
    const ids: string[] = (body.ids ?? []).map(String).slice(0, 50)
    // photos = todas las fotos visibles en orden (galería de la ficha);
    // images = solo la portada (la #1), contrato previo de la vista previa
    const photos = await getInventarioPhotosByIds(ids)
    const images = Object.fromEntries(Object.entries(photos).map(([id, urls]) => [id, urls[0]]))
    return NextResponse.json({ images, photos })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const POST = withTechLog('/api/pdf/images', _POST, { level: 'errors' })
