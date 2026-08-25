import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAnyPermission, isAuthError } from '@/lib/auth/permissions'
import { forceCheckProperty } from '@/lib/services/photo-sync/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const bodySchema = z.object({ propertyId: z.string().uuid() })

/**
 * Botón "Actualizar fotos": revisa la carpeta de Drive de la propiedad en este
 * momento (ignora la ventana de 24 h) y deja el set pendiente si hay algo
 * nuevo; la importación la ejecuta el cliente (usePhotoSync) como siempre.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyPermission(['propiedades.view', 'pdf.view'])
  if (isAuthError(auth)) return auth

  const body = await request.json().catch(() => null)
  if (body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    const { propertyId } = bodySchema.parse(body)
    const data = await forceCheckProperty(propertyId)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Error al revisar la carpeta de Drive'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
