import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import * as dal from '@/lib/dal/anuncios'
import { createNotaSchema } from '@/lib/validations/anuncio'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

const ESTADOS: dal.EstadoFilter[] = ['pendientes', 'completadas', 'todas']

export async function GET(request: NextRequest) {
  const auth = await requirePermission('anuncios.view')
  if (isAuthError(auth)) return auth

  const params = request.nextUrl.searchParams
  const estadoParam = params.get('estado')
  const estado: dal.EstadoFilter = ESTADOS.includes(estadoParam as dal.EstadoFilter)
    ? (estadoParam as dal.EstadoFilter)
    : 'pendientes'
  const before = params.get('before')

  try {
    const notas = await dal.getNotas({
      userId: auth.userId,
      isAdmin: auth.isAdmin,
      estado,
      before,
    })
    const nextCursor =
      notas.length === dal.NOTAS_PAGE_SIZE ? notas[notas.length - 1].created_at : null
    return NextResponse.json({
      data: notas,
      nextCursor,
      me: { id: auth.userId, isAdmin: auth.isAdmin },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('anuncios.view')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const input = createNotaSchema.parse(body)
    const nota = await dal.createNota(input, auth.userId)
    return NextResponse.json({ data: nota }, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
