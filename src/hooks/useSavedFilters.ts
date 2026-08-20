'use client'

import { useCallback, useEffect, useState } from 'react'

export interface SavedFilter {
  id: string
  name: string
  filters: Record<string, string>
  created_at: string
}

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-filters')
      if (!res.ok) return
      const json = await res.json()
      setSavedFilters(json.data ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const saveFilter = useCallback(
    async (name: string, filters: Record<string, string>): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/saved-filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, filters }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          return { ok: false, error: body.error || 'Error al guardar' }
        }
        await refetch()
        return { ok: true }
      } catch {
        return { ok: false, error: 'Error de conexión' }
      }
    },
    [refetch]
  )

  const deleteFilter = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/saved-filters/${id}`, { method: 'DELETE' })
        if (!res.ok && res.status !== 204) return false
        setSavedFilters((prev) => prev.filter((f) => f.id !== id))
        return true
      } catch {
        return false
      }
    },
    []
  )

  return { savedFilters, loading, saveFilter, deleteFilter, refetch }
}
