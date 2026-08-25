import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import * as dal from '@/lib/dal/anuncios'
import { updateNotaSchema } from '@/lib/validations/anuncio'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { diffFields, logAudit, snapshotFields } from '@/lib/services/audit-service'

async function _PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('anuncios.view')
  if (isAuthError(auth)) return auth

  try {
    const nota = await dal.getNotaById(params.id)
    if (!nota) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

    const esCreador = nota.id_creador === auth.userId
    const esResponsable = nota.id_responsable === auth.userId
    if (!auth.isAdmin && !esCreador && !esResponsable) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const patch = updateNotaSchema.parse(body)

    // El responsable (sin ser creador/admin) solo puede palomear la nota
    if (!auth.isAdmin && !esCreador) {
      const otherKeys = Object.keys(patch).filter((k) => k !== 'completada')
      if (otherKeys.length > 0) {
        return NextResponse.json({ error: 'Solo puedes marcarla como completada' }, { status: 403 })
      }
    }

    const updated = await dal.updateNota(params.id, patch)
    const changes = diffFields(
      {
        Título: nota.titulo,
        Nota: nota.nota,
        Responsable: nota.id_responsable,
        Propiedad: nota.id_propiedad,
        Fecha: nota.after_date,
        Completada: nota.completada ?? false,
      },
      {
        Título: patch.titulo,
        Nota: patch.nota,
        Responsable: patch.id_responsable,
        Propiedad: patch.id_propiedad,
        Fecha: patch.after_date,
        Completada: patch.completada,
      }
    )
    if (Object.keys(changes).length > 0) {
      await logAudit({
        actorId: auth.userId,
        action: 'update',
        entity: 'nota',
        entityId: params.id,
        entityLabel: nota.titulo || nota.nota.slice(0, 60),
        changes,
      })
    }
    return NextResponse.json({ data: updated })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

async function _DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('anuncios.view')
  if (isAuthError(auth)) return auth

  try {
    const nota = await dal.getNotaById(params.id)
    if (!nota) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    if (!auth.isAdmin && nota.id_creador !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await dal.deleteNota(params.id)
    await logAudit({
      actorId: auth.userId,
      action: 'delete',
      entity: 'nota',
      entityId: params.id,
      entityLabel: nota.titulo || nota.nota.slice(0, 60),
      changes: snapshotFields({ Título: nota.titulo, Nota: nota.nota }, {}, 'antes'),
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const PATCH = withTechLog('/api/anuncios/[id]', _PATCH)
export const DELETE = withTechLog('/api/anuncios/[id]', _DELETE)
