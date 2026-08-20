import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createDesarrolloSchema } from '@/lib/validations/desarrollo'
import * as dal from '@/lib/dal/desarrollos'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  const auth = await requirePermission('desarrollos.view')
  if (isAuthError(auth)) return auth

  const params = request.nextUrl.searchParams
  const cursor = params.get('cursor') ?? undefined
  const perPage = Math.min(Math.max(parseInt(params.get('per_page') ?? '20') || 20, 1), 50)

  const filters: Record<string, string | number> = {}
  for (const key of ['colonia', 'alcaldia', 'disponibilidad', 'tipo_preventa', 'tipo_entrega', 'bodega', 'search']) {
    const v = params.get(key)
    if (v) filters[key] = v
  }
  const rangeKeys = ['precio', 'm2_totales', 'recamaras', 'banos', 'estacionamientos']
  for (const k of rangeKeys) {
    const min = params.get(`${k}_min`)
    const max = params.get(`${k}_max`)
    if (min && !isNaN(Number(min))) filters[`${k}_min`] = Number(min)
    if (max && !isNaN(Number(max))) filters[`${k}_max`] = Number(max)
  }

  const result = await dal.getDesarrollos(filters, cursor, perPage)

  return NextResponse.json({
    data: result.data,
    pagination: { per_page: perPage, next_cursor: result.nextCursor, has_more: !!result.nextCursor },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission('desarrollos.create')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const validated = createDesarrolloSchema.parse(body)
    const desarrollo = await dal.insertDesarrollo(validated as Record<string, unknown>)
    return NextResponse.json({ data: desarrollo }, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Error creating desarrollo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
