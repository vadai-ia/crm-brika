import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { updateDesarrolloSchema } from '@/lib/validations/desarrollo'
import * as dal from '@/lib/dal/desarrollos'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('desarrollos.edit')
  if (isAuthError(auth)) return auth

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const body = await request.json()
    const validated = updateDesarrolloSchema.parse(body)
    const desarrollo = await dal.updateDesarrollo(numId, validated as Record<string, unknown>)
    return NextResponse.json({ data: desarrollo })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Error updating desarrollo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('desarrollos.delete')
  if (isAuthError(auth)) return auth

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    await dal.deleteDesarrollo(numId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error deleting desarrollo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
