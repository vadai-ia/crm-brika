'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ColumnVisibility, UserRole } from '@/types'

interface UseColumnVisibilityReturn {
  columns: ColumnVisibility[]
  visibleColumns: ColumnVisibility[]
  filterableColumns: ColumnVisibility[]
  loading: boolean
}

export function useColumnVisibility(role: UserRole): UseColumnVisibilityReturn {
  const [columns, setColumns] = useState<ColumnVisibility[]>([])
  const [loading, setLoading] = useState(true)

  const fetchColumns = useCallback(async () => {
    try {
      const res = await fetch('/api/column-visibility')
      if (!res.ok) return
      const data = await res.json()
      setColumns(data)
    } catch (err) {
      console.error('Error fetching column visibility:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchColumns()
  }, [fetchColumns])

  const visibleColumns =
    role === 'admin'
      ? columns
      : columns.filter((c) => c.visible_to_asesores)

  const filterableColumns = visibleColumns.filter(
    (c) => c.filter_type && c.filter_type !== 'none'
  )

  return { columns, visibleColumns, filterableColumns, loading }
}
