// DAL del historial de auditoría (tabla public.audit_logs, sql/010).
// Escritura y lectura con cliente admin: la tabla la consulta el CRM tras
// verificar el permiso logs.view en la API route.

import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AuditAction,
  AuditActor,
  AuditChange,
  AuditEntity,
  AuditLog,
} from '@/types/audit'
import { AUDIT_PAGE_SIZE } from '@/lib/utils/constants'

export interface AuditLogInsert {
  actor_id: string | null
  actor_name: string | null
  actor_email: string | null
  action: AuditAction
  entity: AuditEntity
  entity_id: string | null
  entity_label: string | null
  changes: Record<string, AuditChange> | null
  metadata: Record<string, unknown> | null
}

export async function insertAuditLog(row: AuditLogInsert): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('audit_logs').insert(row)
  if (error) throw new Error(error.message)
}

/** Nombre y email del actor al momento del evento (snapshot). */
export async function getActorSnapshot(
  userId: string
): Promise<{ name: string | null; email: string | null }> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .maybeSingle()
  return { name: data?.full_name ?? null, email: data?.email ?? null }
}

export interface AuditLogFilters {
  entity?: string
  action?: string
  actorId?: string
  search?: string
}

interface AuditLogsPage {
  data: AuditLog[]
  nextCursor: string | null
}

export async function getAuditLogsPage(
  filters: AuditLogFilters = {},
  cursor?: string | null,
  perPage = AUDIT_PAGE_SIZE
): Promise<AuditLogsPage> {
  const supabase = createAdminClient()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(perPage + 1)

  if (cursor) query = query.lt('created_at', cursor)
  if (filters.entity) query = query.eq('entity', filters.entity)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.actorId) query = query.eq('actor_id', filters.actorId)
  if (filters.search) {
    // Comas y paréntesis rompen la sintaxis de .or() de PostgREST
    const q = filters.search.replace(/[,()]/g, ' ').trim()
    if (q) {
      query = query.or(
        `entity_label.ilike.%${q}%,actor_name.ilike.%${q}%,actor_email.ilike.%${q}%`
      )
    }
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as AuditLog[]
  const hasMore = rows.length > perPage
  if (hasMore) rows.pop()

  return {
    data: rows,
    nextCursor: hasMore && rows.length > 0 ? rows[rows.length - 1].created_at : null,
  }
}

/** Usuarios distintos presentes en el historial reciente (para el filtro). */
export async function getAuditActors(): Promise<AuditActor[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('audit_logs')
    .select('actor_id, actor_name')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw new Error(error.message)

  const seen = new Map<string, string>()
  for (const r of data ?? []) {
    const id = r.actor_id as string | null
    if (id && !seen.has(id)) seen.set(id, (r.actor_name as string | null) ?? '')
  }
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name: name || `${id.slice(0, 8)}…` }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
}
