import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { INVENTARIO_TABLE } from '@/lib/utils/inventario'
import { INVENTARIO_COLUMNS } from '@/components/carga-masiva/columns'

interface CheckItem {
  parque: string
  unidad: string
  operacion: string
  row: number
}

function key(parque: unknown, unidad: unknown, operacion: unknown): string {
  return [parque, unidad, operacion].map((v) => String(v ?? '').trim().toLowerCase()).join('|||')
}

// Detecta filas que ya existen en inventario_industrial (unique parque +
// unidad + operacion) y devuelve sus valores actuales para que el cliente
// muestre qué campos cambiarían.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('carga_masiva.view')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const items = (body?.items ?? []) as CheckItem[]
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ duplicates: [] })
    }

    const parques = [...new Set(items.map((i) => i.parque?.trim()).filter(Boolean))]
    if (parques.length === 0) return NextResponse.json({ duplicates: [] })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from(INVENTARIO_TABLE)
      .select(INVENTARIO_COLUMNS.map((c) => c.dbColumn).join(', '))
      .in('parque', parques)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const existing = new Map<string, Record<string, unknown>>()
    for (const r of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      existing.set(key(r.parque, r.unidad, r.operacion), r)
    }

    const duplicates = items
      .map((i) => {
        const current = existing.get(key(i.parque, i.unidad, i.operacion))
        return current ? { row: i.row, current } : null
      })
      .filter(Boolean)
    return NextResponse.json({ duplicates })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
