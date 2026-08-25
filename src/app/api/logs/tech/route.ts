import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { getTechLogsPage } from '@/lib/dal/technical-logs'
import { withTechLog } from '@/lib/services/tech-log'
import type { TechStatusFilter } from '@/types/audit'
import { AUDIT_PAGE_SIZE } from '@/lib/utils/constants'

const STATUS_FILTERS: TechStatusFilter[] = ['errors', '4xx', '5xx', 'slow']
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/**
 * GET /api/logs/tech?cursor=&status=&method=&q=&per_page=
 * Logs técnicos (requests de la API) paginados por cursor.
 */
async function _GET(request: NextRequest) {
  const auth = await requirePermission('logs.view')
  if (isAuthError(auth)) return auth

  const params = request.nextUrl.searchParams
  const cursor = params.get('cursor')
  const perPage = Math.min(
    Math.max(parseInt(params.get('per_page') ?? String(AUDIT_PAGE_SIZE)) || AUDIT_PAGE_SIZE, 1),
    50
  )

  const statusParam = params.get('status') as TechStatusFilter | null
  const status = statusParam && STATUS_FILTERS.includes(statusParam) ? statusParam : undefined
  const methodParam = params.get('method')
  const method = methodParam && METHODS.includes(methodParam) ? methodParam : undefined
  const search = params.get('q')?.trim() || undefined

  try {
    const page = await getTechLogsPage({ status, method, search }, cursor, perPage)
    return NextResponse.json(page)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching tech logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export const GET = withTechLog('/api/logs/tech', _GET)
