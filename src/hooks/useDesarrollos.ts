'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Desarrollo } from '@/types/desarrollo'

interface SortConfig {
  column: string
  order: 'asc' | 'desc'
}

export function useDesarrollos(debouncedFilters: Record<string, string>) {
  const [desarrollos, setDesarrollos] = useState<Desarrollo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'id', order: 'desc' })
  const abortRef = useRef<AbortController>(null)

  const buildUrl = useCallback(
    (cursorVal?: string | null) => {
      const params = new URLSearchParams()
      params.set('per_page', '20')
      if (cursorVal) params.set('cursor', cursorVal)
      for (const [key, value] of Object.entries(debouncedFilters)) {
        if (value) params.set(key, value)
      }
      return `/api/desarrollos?${params.toString()}`
    },
    [debouncedFilters]
  )

  const fetchDesarrollos = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(buildUrl(), { signal: controller.signal })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al cargar desarrollos')
      }
      const json = await res.json()
      setDesarrollos(json.data)
      setHasMore(json.pagination.has_more)
      setCursor(json.pagination.next_cursor)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [buildUrl])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(cursor))
      if (!res.ok) return
      const json = await res.json()
      setDesarrollos((prev) => [...prev, ...json.data])
      setHasMore(json.pagination.has_more)
      setCursor(json.pagination.next_cursor)
    } catch {
      // silent
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, buildUrl])

  useEffect(() => {
    fetchDesarrollos()
  }, [fetchDesarrollos])

  return {
    desarrollos,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    sortConfig,
    setSortConfig,
    retry: fetchDesarrollos,
    refetch: fetchDesarrollos,
  }
}
