import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getProfileById, resetAsesorPassword } from '@/lib/dal/asesores'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { ROLE_ADMIN } from '@/lib/utils/constants'
import { asesorErrorResponse } from '../../errors'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('asesores.edit')
  if (isAuthError(auth)) return auth

  const { id } = await params

  try {
    const target = await getProfileById(id)
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (target.role === ROLE_ADMIN && !auth.isAdmin && id !== auth.userId) {
      return NextResponse.json(
        { error: 'Solo un administrador puede resetear la contraseña de otro administrador' },
        { status: 403 }
      )
    }

    const newPassword = crypto.randomBytes(9).toString('base64url').slice(0, 12)
    await resetAsesorPassword(id, newPassword)
    return NextResponse.json({ password: newPassword })
  } catch (err) {
    return asesorErrorResponse(err, 'Error resetting password')
  }
}
