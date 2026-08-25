import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAnyPermission, isAuthError } from '@/lib/auth/permissions'
import { getInventarioCoversByIds } from '@/lib/dal/property-images'

const MAX_IDS = 50
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const bodySchema = z.object({
  ids: z
    .array(z.string().regex(UUID_RE, { message: 'id inválido' }))
    .max(MAX_IDS, { message: `Máximo ${MAX_IDS} ids por request` }),
})

/**
 * Portada + número de fotos por propiedad (ids uuid de inventario_industrial),
 * para la previsualización de las tarjetas en /dashboard/propiedades.
 */
async function _POST(request: NextRequest) {
  const auth = await requireAnyPermission(['propiedades.view', 'pdf.view'])
  if (isAuthError(auth)) return auth

  const body = await request.json().catch(() => null)
  if (body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    const { ids } = bodySchema.parse(body)
    const covers = await getInventarioCoversByIds([...new Set(ids)])
    return NextResponse.json({ covers })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error al cargar portadas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const POST = withTechLog('/api/properties/images', _POST, { level: 'errors' })
