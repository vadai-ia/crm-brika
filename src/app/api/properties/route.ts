import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createInventarioSchema } from '@/lib/validations/inventario'
import * as propertyService from '@/lib/services/property-service'
import {
  INVENTARIO_FIELD_LABELS,
  inventarioLabel,
  logAudit,
  snapshotFields,
} from '@/lib/services/audit-service'
import { resolveColumnVariants } from '@/lib/dal/filter-options'
import {
  INVENTARIO_TABLE,
  KEY_TO_COLUMN,
  SEARCH_COLUMNS,
  mapInventarioRow,
} from '@/lib/utils/inventario'

async function _GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const cursor = params.get('cursor')
  const perPage = Math.min(Math.max(parseInt(params.get('per_page') ?? '20') || 20, 1), 50)
  const sortBy = params.get('sort_by') ?? 'created_at'
  const sortOrder = params.get('sort_order') === 'asc' ? true : false

  // Claves del frontend con valor numérico en inventario_industrial.
  // Las claves sin equivalente (recámaras, baños, etc.) se ignoran.
  const NUMERIC_KEYS = [
    'precio_unidad',
    'm2_totales',
    'm2_habitables',
    'm2_exteriores',
  ]

  // inventario_industrial tiene RLS sin políticas (lo administra el
  // sistema Laravel); se lee con service role tras verificar sesión.
  const admin = createAdminClient()
  const sortColumn = KEY_TO_COLUMN[sortBy] ?? 'created_at'

  let query = admin
    .from(INVENTARIO_TABLE)
    .select('*')
    .order(sortColumn, { ascending: sortOrder })
    .limit(perPage + 1)

  if (cursor) {
    if (sortOrder) {
      query = query.gt('id', cursor)
    } else {
      query = query.lt('id', cursor)
    }
  }

  // Filtros de catálogo (traducidos a columnas reales). El valor elegido se
  // expande a todas sus variantes de mayúsculas/acentos presentes en la BD
  // ("Colón" → ["Colon", "Colón", "colón "]) para traerlas todas.
  const filterParams = [
    'alcaldia',
    'colonia',
    'disponibilidad',
    'tipo_preventa',
    'tipo_entrega',
  ]
  for (const key of filterParams) {
    const value = params.get(key)
    const column = KEY_TO_COLUMN[key]
    if (value && column) {
      const variants = await resolveColumnVariants(column, value)
      query = query.in(column, variants)
    }
  }

  // Range filters — strict empty-string guard before applying.
  for (const key of NUMERIC_KEYS) {
    const column = KEY_TO_COLUMN[key]
    const minRaw = params.get(`${key}_min`)
    const maxRaw = params.get(`${key}_max`)
    if (minRaw !== null && minRaw.trim() !== '' && !isNaN(Number(minRaw))) {
      query = query.gte(column, Number(minRaw))
    }
    if (maxRaw !== null && maxRaw.trim() !== '' && !isNaN(Number(maxRaw))) {
      query = query.lte(column, Number(maxRaw))
    }
  }

  // Text search — ilike is case-insensitive. To also handle accents,
  // replace vowels in the query with _ (SQL single-char wildcard) so
  // "mexico" becomes "m_xic_" matching "México".
  const search = params.get('search')
  if (search) {
    const accent = search.replace(/[aáàä]/gi, '_').replace(/[eéèë]/gi, '_').replace(/[iíìï]/gi, '_').replace(/[oóòö]/gi, '_').replace(/[uúùü]/gi, '_')
    const conditions = SEARCH_COLUMNS.map((c) => `${c}.ilike.%${accent}%`).join(',')
    query = query.or(conditions)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching properties:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const hasMore = (data?.length ?? 0) > perPage
  const items = (data ?? []).map(mapInventarioRow)
  if (hasMore) items.pop()

  const nextCursor = hasMore && items.length > 0
    ? String(items[items.length - 1].id)
    : null

  return NextResponse.json({
    data: items,
    pagination: {
      per_page: perPage,
      next_cursor: nextCursor,
      has_more: hasMore,
    },
  })
}

async function _POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = createInventarioSchema.parse(body)
    const property = await propertyService.createProperty(validated)
    await logAudit({
      actorId: user.id,
      action: 'create',
      entity: 'propiedad',
      entityId: String(property.id),
      entityLabel: inventarioLabel(validated),
      changes: snapshotFields(validated, INVENTARIO_FIELD_LABELS),
    })
    return NextResponse.json({ data: property }, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Error creating property'
    const status = message.includes('Ya existe') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/properties', _GET)
export const POST = withTechLog('/api/properties', _POST)
