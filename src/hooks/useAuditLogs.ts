'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AuditActor, AuditLog, AuditLogsResponse } from '@/types/audit'

export interface LogFiltersState {
  entity: string
  action: string
  actor: string
  q: string
}

export const EMPTY_LOG_FILTERS: LogFiltersState = {
  entity: '',
  action: '',
  actor: '',
  q: '',
}

function buildUrl(filters: LogFiltersState, cursor?: string | null): string {
  const params = new URLSearchParams()
  if (filters.entity) params.set('entity', filters.entity)
  if (filters.action) params.set('action', filters.action)
  if (filters.actor) params.set('actor', filters.actor)
  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return `/api/logs${qs ? `?${qs}` : ''}`
}

async function fetchLogs(url: string): Promise<AuditLogsResponse> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) {
    const body = await r.json().catch(() => null)
    throw new Error(body?.error ?? `Error ${r.status}`)
  }
  return r.json()
}

export function useAuditLogs() {
  const [filters, setFilters] = useState<LogFiltersState>(EMPTY_LOG_FILTERS)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [actors, setActors] = useState<AuditActor[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  // Recarga la primera página al cambiar filtros (debounce corto para el buscador)
  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    const t = setTimeout(async () => {
      try {
        const data = await fetchLogs(buildUrl(filters))
        if (requestId.current !== id) return
        setLogs(data.data)
        setNextCursor(data.nextCursor)
        if (data.actors) setActors(data.actors)
      } catch (e) {
        if (requestId.current === id) {
          setError(e instanceof Error ? e.message : 'Error cargando el historial')
        }
      } finally {
        if (requestId.current === id) setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [filters])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    const id = requestId.current
    setLoadingMore(true)
    try {
      const data = await fetchLogs(buildUrl(filters, nextCursor))
      if (requestId.current !== id) return
      setLogs((prev) => [...prev, ...data.data])
      setNextCursor(data.nextCursor)
    } catch (e) {
      if (requestId.current === id) {
        setError(e instanceof Error ? e.message : 'Error cargando más registros')
      }
    } finally {
      if (requestId.current === id) setLoadingMore(false)
    }
  }, [filters, nextCursor, loadingMore])

  return { filters, setFilters, logs, actors, nextCursor, loading, loadingMore, error, loadMore }
}
