import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { INVENTARIO_TABLE } from '@/lib/utils/inventario'
import { INVENTARIO_COLUMNS } from '@/components/carga-masiva/columns'
import { detectPending } from '@/lib/services/photo-sync/sync'
import {
  INVENTARIO_FIELD_LABELS,
  diffFields,
  inventarioLabel,
  logAudit,
} from '@/lib/services/audit-service'
import type { BulkRowDetail } from '@/types/audit'

const ALLOWED = new Set(INVENTARIO_COLUMNS.map((c) => c.dbColumn))
const NUMERIC = new Set(INVENTARIO_COLUMNS.filter((c) => c.type === 'number').map((c) => c.dbColumn))
const MAX_ROWS = 2000
const UPDATE_CHUNK = 10

function tripleKey(parque: unknown, unidad: unknown, operacion: unknown): string {
  return [parque, unidad, operacion].map((v) => String(v ?? '').trim().toLowerCase()).join('|||')
}

// Carga masiva: inserta filas nuevas y ACTUALIZA las que ya existen
// (match por parque + unidad + operacion, el unique de la tabla).
async function _POST(request: NextRequest) {
  const auth = await requirePermission('carga_masiva.view')
  if (isAuthError(auth)) return auth

  try {
    const body = await request.json()
    const items = (body?.items ?? []) as Array<Record<string, unknown>>
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay filas para cargar' }, { status: 400 })
    }
    if (items.length > MAX_ROWS) {
      return NextResponse.json({ error: `Máximo ${MAX_ROWS} filas por carga` }, { status: 400 })
    }

    // Solo columnas permitidas, con tipos correctos; vacíos fuera
    const rows = items.map((item) => {
      const row: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(item)) {
        if (!ALLOWED.has(k) || v === null || v === undefined || v === '') continue
        row[k] = NUMERIC.has(k) ? Number(v) : v
      }
      return row
    })

    for (const row of rows) {
      if (!row.parque || !row.unidad || !row.operacion) {
        return NextResponse.json(
          { error: 'Cada fila necesita Parque, Unidad y Operación' },
          { status: 400 }
        )
      }
    }

    const supabase = createAdminClient()

    // Filas que ya existen (completas, para el diff del historial)
    const parques = [...new Set(rows.map((r) => String(r.parque)))]
    const { data: existing, error: exErr } = await supabase
      .from(INVENTARIO_TABLE)
      .select('*')
      .in('parque', parques)
    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 })
    }
    const existingByKey = new Map<string, Record<string, unknown>>()
    for (const r of (existing ?? []) as Array<Record<string, unknown>>) {
      existingByKey.set(tripleKey(r.parque, r.unidad, r.operacion), r)
    }

    const toInsert: Array<Record<string, unknown>> = []
    const toUpdate: Array<{
      id: string
      fields: Record<string, unknown>
      before: Record<string, unknown>
    }> = []
    for (const row of rows) {
      const current = existingByKey.get(tripleKey(row.parque, row.unidad, row.operacion))
      if (current) toUpdate.push({ id: String(current.id), fields: row, before: current })
      else toInsert.push(row)
    }

    // Detalle para el historial de auditoría (capado para no inflar el log)
    const MAX_DETAIL = 300
    const buildBulkMetadata = (updatedCount: number, error?: string) => {
      const actualizadas: BulkRowDetail[] = []
      for (const { fields, before } of toUpdate.slice(0, MAX_DETAIL)) {
        const cambios = diffFields(before, fields, INVENTARIO_FIELD_LABELS)
        if (Object.keys(cambios).length > 0) {
          actualizadas.push({ propiedad: inventarioLabel(fields), cambios })
        }
      }
      return {
        inserted: toInsert.length,
        updated: updatedCount,
        nuevas: toInsert.slice(0, MAX_DETAIL).map((r) => inventarioLabel(r)),
        actualizadas,
        ...(toInsert.length > MAX_DETAIL
          ? { nuevas_omitidas: toInsert.length - MAX_DETAIL }
          : {}),
        ...(toUpdate.length > MAX_DETAIL
          ? { actualizadas_omitidas: toUpdate.length - MAX_DETAIL }
          : {}),
        ...(error ? { error } : {}),
      }
    }

    // Insert masivo: PostgREST exige llaves uniformes → normalizar con null
    if (toInsert.length > 0) {
      const allKeys = [...new Set(toInsert.flatMap((r) => Object.keys(r)))]
      const uniform = toInsert.map((r) => {
        const out: Record<string, unknown> = {}
        for (const k of allKeys) out[k] = r[k] ?? null
        return out
      })
      const { error } = await supabase.from(INVENTARIO_TABLE).insert(uniform)
      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Alguna fila ya existe en el inventario (misma combinación Parque + Unidad + Operación). Vuelve a revisar el archivo.' },
            { status: 409 }
          )
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Updates por fila: solo se sobrescriben los campos con valor
    let updated = 0
    for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
      const chunk = toUpdate.slice(i, i + UPDATE_CHUNK)
      const results = await Promise.all(
        chunk.map(({ id, fields }) =>
          supabase.from(INVENTARIO_TABLE).update(fields).eq('id', id)
        )
      )
      const failed = results.find((r) => r.error)
      updated += results.filter((r) => !r.error).length
      if (failed?.error) {
        await logAudit({
          actorId: auth.userId,
          action: 'carga_masiva',
          entity: 'propiedad',
          entityLabel: `${toInsert.length} nuevas, ${updated} actualizadas (con error)`,
          metadata: buildBulkMetadata(updated, failed.error.message),
        })
        return NextResponse.json(
          {
            error: `Se agregaron ${toInsert.length} y se actualizaron ${updated} de ${toUpdate.length}, pero una actualización falló: ${failed.error.message}`,
          },
          { status: 500 }
        )
      }
    }

    await logAudit({
      actorId: auth.userId,
      action: 'carga_masiva',
      entity: 'propiedad',
      entityLabel: `${toInsert.length} nuevas, ${updated} actualizadas`,
      metadata: buildBulkMetadata(updated),
    })

    // Fotos: registra carpetas de Drive nuevas y mapea propiedades (solo BD); la
    // importación la dispara el cliente al volver a Propiedades (usePhotoSync).
    detectPending().catch((e) => console.error('photo-sync detect:', e))

    return NextResponse.json({ success: true, inserted: toInsert.length, updated })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const POST = withTechLog('/api/carga-masiva/insert', _POST)
