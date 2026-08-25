import { NextRequest, NextResponse } from 'next/server'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'
import { getAuditActors, getAuditLogsPage } from '@/lib/dal/audit'
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/types/audit'
import { AUDIT_PAGE_SIZE } from '@/lib/utils/constants'

/**
 * GET /api/logs?cursor=&entity=&action=&actor=&q=&per_page=
 * Historial de auditoría paginado por cursor (created_at). La primera
 * página (sin cursor) incluye también los usuarios para el filtro.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission('logs.view')
  if (isAuthError(auth)) return auth

  const params = request.nextUrl.searchParams
  const cursor = params.get('cursor')
  const perPage = Math.min(
    Math.max(parseInt(params.get('per_page') ?? String(AUDIT_PAGE_SIZE)) || AUDIT_PAGE_SIZE, 1),
    50
  )

  const entityParam = params.get('entity')
  const actionParam = params.get('action')
  const entity =
    entityParam && (AUDIT_ENTITIES as readonly string[]).includes(entityParam)
      ? entityParam
      : undefined
  const action =
    actionParam && (AUDIT_ACTIONS as readonly string[]).includes(actionParam)
      ? actionParam
      : undefined
  const actorId = params.get('actor') ?? undefined
  const search = params.get('q')?.trim() || undefined

  try {
    const page = await getAuditLogsPage({ entity, action, actorId, search }, cursor, perPage)
    if (!cursor) {
      const actors = await getAuditActors()
      return NextResponse.json({ ...page, actors })
    }
    return NextResponse.json(page)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
