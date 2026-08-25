import { NextRequest, NextResponse } from 'next/server'
import * as dal from '@/lib/dal/asesores'
import { createAsesorSchema } from '@/lib/validations/asesor'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { ROLE_ADMIN, ROLE_ASESOR } from '@/lib/utils/constants'
import { logAudit, snapshotFields } from '@/lib/services/audit-service'
import { asesorErrorResponse } from './errors'

/**
 * GET /api/asesores?before=<created_at>&limit=<n>
 * Devuelve TODOS los perfiles (incluidos admins) paginados por cursor,
 * más `meta` con el usuario actual para que la UI bloquee acciones sobre sí mismo.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission('asesores.view')
  if (isAuthError(auth)) return auth

  const { searchParams } = request.nextUrl
  const before = searchParams.get('before')
  const limitParam = Number(searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined

  try {
    const page = await dal.getProfilesPage({ before, limit })
    return NextResponse.json({
      ...page,
      meta: { currentUserId: auth.userId, isAdmin: auth.isAdmin },
    })
  } catch (err) {
    return asesorErrorResponse(err, 'Error fetching asesores')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('asesores.create')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const validated = createAsesorSchema.parse(body)

    if (validated.role === ROLE_ADMIN && !auth.isAdmin) {
      return NextResponse.json(
        { error: 'Solo un administrador puede crear administradores' },
        { status: 403 }
      )
    }

    const profile = await dal.createAsesor(validated)
    await logAudit({
      actorId: auth.userId,
      action: 'create',
      entity: 'usuario',
      entityId: profile.id,
      entityLabel: `${profile.full_name} (${profile.email})`,
      changes: snapshotFields({
        Nombre: validated.full_name,
        Email: validated.email,
        Rol: validated.role ?? ROLE_ASESOR,
      }),
    })
    return NextResponse.json({ data: profile }, { status: 201 })
  } catch (err) {
    return asesorErrorResponse(err, 'Error creating asesor')
  }
}
