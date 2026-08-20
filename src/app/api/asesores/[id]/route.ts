import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/asesores'
import { updateAsesorSchema } from '@/lib/validations/asesor'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { ROLE_ADMIN } from '@/lib/utils/constants'
import { asesorErrorResponse } from '../errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission('asesores.edit')
  if (isAuthError(auth)) return auth

  const { id } = await params

  try {
    const body = await request.json()
    const patch = updateAsesorSchema.parse(body)

    const target = await dal.getProfileById(id)
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Un no-admin con asesores.edit no puede tocar administradores ni otorgar el rol admin
    if (target.role === ROLE_ADMIN && !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Solo un administrador puede modificar a otro administrador' },
        { status: 403 }
      )
    }
    if (patch.role === ROLE_ADMIN && !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Solo un administrador puede asignar el rol admin' },
        { status: 403 }
      )
    }

    // Protección sobre la propia cuenta: puede editar sus datos, no bloquearse ni cambiarse el rol
    if (id === auth.userId) {
      if (patch.is_active === false) {
        return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 403 })
      }
      if (patch.role && patch.role !== target.role) {
        return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 403 })
      }
    }

    const updated = await dal.updateAsesor(id, patch)
    return NextResponse.json({ data: updated })
  } catch (err) {
    return asesorErrorResponse(err, 'Error updating asesor')
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requirePermission('asesores.delete')
  if (isAuthError(auth)) return auth

  const { id } = await params

  if (id === auth.userId) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 403 })
  }

  try {
    const target = await dal.getProfileById(id)
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (target.role === ROLE_ADMIN && !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Solo un administrador puede eliminar a otro administrador' },
        { status: 403 }
      )
    }

    await dal.deleteAsesor(id)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return asesorErrorResponse(err, 'Error deleting asesor')
  }
}
