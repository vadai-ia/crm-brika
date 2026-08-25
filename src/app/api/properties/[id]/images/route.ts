import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAnyPermission, requirePermission, isAuthError } from '@/lib/auth/permissions'
import { getPropertyImages, getPropertyImageNames } from '@/lib/dal/property-images'
import { setImagesOrder, setImagesVisibility } from '@/lib/dal/image-visibility'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const nameSchema = z.string().min(1).max(255)

// { names, visible } → mostrar/ocultar en la web; { order } → orden completo (la #1 visible es la portada)
const patchSchema = z.union([
  z.object({ names: z.array(nameSchema).min(1).max(200), visible: z.boolean() }),
  z.object({ order: z.array(nameSchema).min(1).max(200) }),
])

/** Todas las fotos del set de una propiedad, en orden, con visibilidad en la web. */
async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAnyPermission(['propiedades.view', 'pdf.view'])
  if (isAuthError(auth)) return auth

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const data = await getPropertyImages(id)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cargar las fotos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Visibilidad u orden de las fotos de la propiedad para la página web
 * (propiedad_imagenes_visibilidad). Responde con el set actualizado.
 */
async function _PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('propiedades.edit')
  if (isAuthError(auth)) return auth

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    const parsed = patchSchema.parse(body)
    const names = 'order' in parsed ? parsed.order : parsed.names

    // Solo se aceptan archivos que existen en el set de la propiedad
    const known = await getPropertyImageNames(id)
    if (known === null) {
      return NextResponse.json({ error: 'La propiedad no tiene fotos ligadas' }, { status: 404 })
    }
    const knownSet = new Set(known)
    const unknown = names.filter((n) => !knownSet.has(n))
    if (unknown.length > 0) {
      return NextResponse.json(
        { error: 'Fotos desconocidas para esta propiedad', details: unknown },
        { status: 400 }
      )
    }

    if ('order' in parsed) {
      await setImagesOrder(id, [...new Set(parsed.order)], auth.userId)
    } else {
      await setImagesVisibility(id, [...new Set(parsed.names)], parsed.visible, auth.userId)
    }
    const data = await getPropertyImages(id)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error al guardar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/properties/[id]/images', _GET)
export const PATCH = withTechLog('/api/properties/[id]/images', _PATCH)
