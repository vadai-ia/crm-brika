'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Property } from '@/types'

interface SortConfig {
  column: string
  order: 'asc' | 'desc'
}

interface UsePropertiesReturn {
  properties: Property[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  sortConfig: SortConfig
  setSortConfig: (config: SortConfig) => void
  retry: () => void
  refetch: () => void
}

export function useProperties(
  debouncedFilters: Record<string, string>
): UsePropertiesReturn {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'created_at',
    order: 'desc',
  })
  const abortRef = useRef<AbortController>(null)
  const loadMoreAbortRef = useRef<AbortController>(null)
  // Época de la lista: cambia con cada búsqueda/filtro/orden nuevo. Una
  // respuesta de "Cargar más" de una época vieja NUNCA se aplica (llegaría
  // tarde y anexaría resultados de la búsqueda anterior a la actual).
  const epochRef = useRef(0)

  const buildUrl = useCallback(
    (cursorVal?: string | null) => {
      const params = new URLSearchParams()
      params.set('per_page', '20')
      params.set('sort_by', sortConfig.column)
      params.set('sort_order', sortConfig.order)
      if (cursorVal) params.set('cursor', cursorVal)

      for (const [key, value] of Object.entries(debouncedFilters)) {
        if (value) params.set(key, value)
      }

      return `/api/properties?${params.toString()}`
    },
    [debouncedFilters, sortConfig]
  )

  const fetchProperties = useCallback(async () => {
    // Nueva época: aborta cualquier request en vuelo (incluido "Cargar más")
    if (abortRef.current) abortRef.current.abort()
    if (loadMoreAbortRef.current) loadMoreAbortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const epoch = ++epochRef.current

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(buildUrl(), { signal: controller.signal })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error al cargar propiedades')
      }
      const json = await res.json()
      if (epochRef.current !== epoch) return
      setProperties(json.data)
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
    // `loading`: el cursor pertenece a la lista anterior mientras hay una
    // búsqueda en vuelo — ignorar el click en vez de traer la página vieja.
    if (!cursor || loadingMore || loading) return
    const controller = new AbortController()
    loadMoreAbortRef.current = controller
    const epoch = epochRef.current
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(cursor), { signal: controller.signal })
      if (!res.ok) return
      const json = await res.json()
      if (epochRef.current !== epoch) return
      setProperties((prev) => [...prev, ...json.data])
      setHasMore(json.pagination.has_more)
      setCursor(json.pagination.next_cursor)
    } catch {
      // Silently fail on load more
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, loading, buildUrl])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  return {
    properties,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    sortConfig,
    setSortConfig,
    retry: fetchProperties,
    refetch: fetchProperties,
  }
}
