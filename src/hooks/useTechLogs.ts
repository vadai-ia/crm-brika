'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TechLog, TechLogsResponse, TechStatusFilter } from '@/types/audit'

export interface TechFiltersState {
  status: TechStatusFilter
  method: string
  q: string
}

export const EMPTY_TECH_FILTERS: TechFiltersState = {
  status: '',
  method: '',
  q: '',
}

function buildUrl(filters: TechFiltersState, cursor?: string | null): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.method) params.set('method', filters.method)
  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return `/api/logs/tech${qs ? `?${qs}` : ''}`
}

async function fetchTechLogs(url: string): Promise<TechLogsResponse> {
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) {
    const body = await r.json().catch(() => null)
    throw new Error(body?.error ?? `Error ${r.status}`)
  }
  return r.json()
}

export function useTechLogs() {
  const [filters, setFilters] = useState<TechFiltersState>(EMPTY_TECH_FILTERS)
  const [logs, setLogs] = useState<TechLog[]>([])
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
        const data = await fetchTechLogs(buildUrl(filters))
        if (requestId.current !== id) return
        setLogs(data.data)
        setNextCursor(data.nextCursor)
      } catch (e) {
        if (requestId.current === id) {
          setError(e instanceof Error ? e.message : 'Error cargando los logs técnicos')
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
      const data = await fetchTechLogs(buildUrl(filters, nextCursor))
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

  return { filters, setFilters, logs, nextCursor, loading, loadingMore, error, loadMore }
}
