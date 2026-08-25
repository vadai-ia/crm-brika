import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAnyPermission, isAuthError } from '@/lib/auth/permissions'
import { forceCheckProperty } from '@/lib/services/photo-sync/sync'
import { getInventarioRawById } from '@/lib/dal/properties'
import { inventarioLabel, logAudit } from '@/lib/services/audit-service'
import type { ForceCheckStatus } from '@/types/inventario'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const bodySchema = z.object({ propertyId: z.string().uuid() })

// Resultado de la revisión en palabras, para el historial (módulo Logs)
const RESULT_LABELS: Record<ForceCheckStatus, string> = {
  pending: 'Se encontraron cambios en Drive: importación iniciada',
  unchanged: 'Sin fotos nuevas en Drive',
  no_link: 'La propiedad no tiene link de Drive',
  not_public: 'La carpeta de Drive no es pública',
}

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
    // El botón "Actualizar fotos" SÍ se registra en el historial (a diferencia
    // del flujo automático de photo-sync, excluido a pedido del usuario).
    const row = await getInventarioRawById(propertyId)
    await logAudit({
      actorId: auth.userId,
      action: 'actualizar_fotos',
      entity: 'propiedad',
      entityId: propertyId,
      entityLabel: inventarioLabel(row),
      metadata: {
        resultado: RESULT_LABELS[data.status],
        ...(data.message ? { mensaje: data.message } : {}),
      },
    })
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Error al revisar la carpeta de Drive'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
