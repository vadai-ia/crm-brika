// Tipos del historial de auditoría (tabla public.audit_logs, sql/010-audit-logs.sql).

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'carga_masiva',
  'reset_password',
  'test',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const AUDIT_ENTITIES = [
  'propiedad',
  'usuario',
  'rol',
  'webhook',
  'api_key',
  'nota',
  'desarrollo',
  'columnas',
] as const
export type AuditEntity = (typeof AUDIT_ENTITIES)[number]

/** Cambio de un campo. La clave del mapa `changes` es la etiqueta visible del campo. */
export interface AuditChange {
  antes: unknown
  despues: unknown
}

/** Detalle por propiedad actualizada dentro de una carga masiva. */
export interface BulkRowDetail {
  propiedad: string
  cambios: Record<string, AuditChange>
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_name: string | null
  actor_email: string | null
  action: AuditAction
  entity: AuditEntity
  entity_id: string | null
  entity_label: string | null
  changes: Record<string, AuditChange> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

/** Usuario que aparece en el historial (para el filtro por usuario). */
export interface AuditActor {
  id: string
  name: string
}

export interface AuditLogsResponse {
  data: AuditLog[]
  nextCursor: string | null
  /** Solo viene en la primera página (sin cursor). */
  actors?: AuditActor[]
}
