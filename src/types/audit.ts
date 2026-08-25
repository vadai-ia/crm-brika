// Tipos del historial de auditoría (tabla public.audit_logs, sql/010-audit-logs.sql).

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'carga_masiva',
  'reset_password',
  'test',
  'actualizar_fotos',
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

// ---- Logs técnicos (tabla public.technical_logs, sql/011) ----

export interface TechLog {
  id: string
  method: string
  /** Plantilla de la ruta: /api/properties/[id] */
  route: string
  /** Ruta real del request: /api/properties/8f3a… */
  path: string | null
  status: number
  duration_ms: number | null
  user_id: string | null
  user_email: string | null
  error: string | null
  created_at: string
}

/** Filtro de status de la pestaña Técnicos. */
export type TechStatusFilter = '' | 'errors' | '4xx' | '5xx' | 'slow'

export interface TechLogsResponse {
  data: TechLog[]
  nextCursor: string | null
}
