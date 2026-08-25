// Servicio del historial de auditoría: registra quién hizo qué en el CRM.
// Las rutas de escritura llaman a logAudit() DESPUÉS de que la operación
// tuvo éxito; un fallo del log nunca tumba la operación original.
//
// EXCLUIDO del historial a pedido del usuario: la selección/orden de fotos
// para la web (propiedad_imagenes_visibilidad) y photo-sync (image_sets).

import { getActorSnapshot, insertAuditLog } from '@/lib/dal/audit'
import { INVENTARIO_COLUMNS } from '@/components/carga-masiva/columns'
import type { AuditAction, AuditChange, AuditEntity } from '@/types/audit'

/** Etiqueta visible de cada columna del inventario (la misma de carga masiva). */
export const INVENTARIO_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  INVENTARIO_COLUMNS.map((c) => [c.dbColumn, c.header])
)

/** Etiqueta legible de una propiedad: "Parque · Unidad · Operación". */
export function inventarioLabel(
  row: Record<string, unknown> | null | undefined
): string {
  if (!row) return ''
  return [row.parque, row.unidad, row.operacion]
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
    .map((v) => String(v).trim())
    .join(' · ')
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === ''
}

/** Compara valores como los guarda la BD: texto normalizado, números por valor. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true
  if (typeof a === 'boolean' || typeof b === 'boolean') return a === b
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b)
  const sa = String(a ?? '').trim()
  const sb = String(b ?? '').trim()
  if (sa === sb) return true
  const na = Number(sa)
  const nb = Number(sb)
  return sa !== '' && sb !== '' && !Number.isNaN(na) && !Number.isNaN(nb) && na === nb
}

/**
 * Diff campo a campo: solo considera las claves presentes en `after`
 * (las `undefined` se ignoran: son campos que el patch no tocó).
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string> = {}
): Record<string, AuditChange> {
  const changes: Record<string, AuditChange> = {}
  for (const [key, value] of Object.entries(after)) {
    if (value === undefined) continue
    const prev = before[key]
    if (sameValue(prev, value)) continue
    changes[labels[key] ?? key] = { antes: prev ?? null, despues: value ?? null }
  }
  return changes
}

/** Snapshot de los valores con contenido (altas: antes=null; bajas: despues=null). */
export function snapshotFields(
  values: Record<string, unknown>,
  labels: Record<string, string> = {},
  side: 'despues' | 'antes' = 'despues'
): Record<string, AuditChange> {
  const changes: Record<string, AuditChange> = {}
  for (const [key, value] of Object.entries(values)) {
    if (isEmpty(value) || (Array.isArray(value) && value.length === 0)) continue
    changes[labels[key] ?? key] =
      side === 'despues' ? { antes: null, despues: value } : { antes: value, despues: null }
  }
  return changes
}

/** Subconjunto de un objeto con solo las claves que tienen etiqueta conocida. */
export function pickFields(
  row: Record<string, unknown>,
  labels: Record<string, string>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(labels)) {
    if (key in row) out[key] = row[key]
  }
  return out
}

interface LogAuditParams {
  actorId: string | null
  action: AuditAction
  entity: AuditEntity
  entityId?: string | null
  entityLabel?: string | null
  changes?: Record<string, AuditChange> | null
  metadata?: Record<string, unknown> | null
}

/**
 * Registra una entrada en el historial. NUNCA lanza: si el log falla
 * (p. ej. la tabla audit_logs aún no existe) solo se reporta en consola.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const actor = params.actorId
      ? await getActorSnapshot(params.actorId)
      : { name: null, email: null }
    const changes =
      params.changes && Object.keys(params.changes).length > 0 ? params.changes : null
    await insertAuditLog({
      actor_id: params.actorId,
      actor_name: actor.name,
      actor_email: actor.email,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      changes,
      metadata: params.metadata ?? null,
    })
  } catch (err) {
    console.error('audit log:', err instanceof Error ? err.message : err)
  }
}
