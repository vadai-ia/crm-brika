// DAL de logs técnicos (tabla public.technical_logs, sql/011).
// Escritura desde withTechLog (lib/services/tech-log.ts); lectura desde
// GET /api/logs/tech tras verificar el permiso logs.view.

import { createAdminClient } from '@/lib/supabase/admin'
import type { TechLog, TechStatusFilter } from '@/types/audit'
import { AUDIT_PAGE_SIZE } from '@/lib/utils/constants'

/** Umbral de request "lento" (ms): se registra aunque sea GET exitoso. */
export const SLOW_REQUEST_MS = 2000

export interface TechLogInsert {
  method: string
  route: string
  path: string | null
  status: number
  duration_ms: number | null
  user_id: string | null
  user_email: string | null
  error: string | null
}

export async function insertTechLog(row: TechLogInsert): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('technical_logs').insert(row)
  if (error) throw new Error(error.message)
}

export interface TechLogFilters {
  status?: TechStatusFilter
  method?: string
  search?: string
}

interface TechLogsPage {
  data: TechLog[]
  nextCursor: string | null
}

export async function getTechLogsPage(
  filters: TechLogFilters = {},
  cursor?: string | null,
  perPage = AUDIT_PAGE_SIZE
): Promise<TechLogsPage> {
  const supabase = createAdminClient()

  let query = supabase
    .from('technical_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(perPage + 1)

  if (cursor) query = query.lt('created_at', cursor)
  if (filters.method) query = query.eq('method', filters.method)
  switch (filters.status) {
    case 'errors':
      query = query.gte('status', 400)
      break
    case '4xx':
      query = query.gte('status', 400).lt('status', 500)
      break
    case '5xx':
      query = query.gte('status', 500)
      break
    case 'slow':
      query = query.gte('duration_ms', SLOW_REQUEST_MS)
      break
  }
  if (filters.search) {
    // Comas y paréntesis rompen la sintaxis de .or() de PostgREST
    const q = filters.search.replace(/[,()]/g, ' ').trim()
    if (q) {
      query = query.or(
        `route.ilike.%${q}%,path.ilike.%${q}%,error.ilike.%${q}%,user_email.ilike.%${q}%`
      )
    }
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as TechLog[]
  const hasMore = rows.length > perPage
  if (hasMore) rows.pop()

  return {
    data: rows,
    nextCursor: hasMore && rows.length > 0 ? rows[rows.length - 1].created_at : null,
  }
}
