import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { updateInventarioSchema } from '@/lib/validations/inventario'
import * as propertyService from '@/lib/services/property-service'
import {
  INVENTARIO_FIELD_LABELS,
  diffFields,
  inventarioLabel,
  logAudit,
  pickFields,
  snapshotFields,
} from '@/lib/services/audit-service'
import { getInventarioRawById, getPropertyById } from '@/lib/dal/properties'
import { requireAnyPermission, isAuthError } from '@/lib/auth/permissions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Propiedad completa (todas las columnas mapeadas). La usan el módulo PDF y el detalle. */
async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAnyPermission(['propiedades.view', 'pdf.view', 'carta_propuesta.view'])
  if (isAuthError(auth)) return auth

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const property = await getPropertyById(id)
  if (!property) {
    return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
  }
  return NextResponse.json({ data: property })
}

async function verifyAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return { error: 'Forbidden', status: 403 }

  return { user }
}

async function _PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const validated = updateInventarioSchema.parse(body)
    const before = await getInventarioRawById(id)
    const property = await propertyService.updateProperty(id, validated)
    const changes = before
      ? diffFields(before, validated, INVENTARIO_FIELD_LABELS)
      : snapshotFields(validated, INVENTARIO_FIELD_LABELS)
    if (Object.keys(changes).length > 0) {
      await logAudit({
        actorId: auth.user.id,
        action: 'update',
        entity: 'propiedad',
        entityId: id,
        entityLabel: inventarioLabel(before ?? validated),
        changes,
      })
    }
    return NextResponse.json({ data: property })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error updating property'
    const status = message.includes('not found') ? 404 : message.includes('Ya existe') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const before = await getInventarioRawById(id)
    await propertyService.deleteProperty(id)
    await logAudit({
      actorId: auth.user.id,
      action: 'delete',
      entity: 'propiedad',
      entityId: id,
      entityLabel: inventarioLabel(before),
      changes: before
        ? snapshotFields(pickFields(before, INVENTARIO_FIELD_LABELS), INVENTARIO_FIELD_LABELS, 'antes')
        : null,
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error deleting property'
    const status = message.includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/properties/[id]', _GET)
export const PUT = withTechLog('/api/properties/[id]', _PUT)
export const DELETE = withTechLog('/api/properties/[id]', _DELETE)
