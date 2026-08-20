'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface FilterValue {
  key: string
  value: string
  label: string
  displayValue: string
}

interface UseFiltersReturn {
  activeFilters: Record<string, string>
  setFilter: (key: string, value: string, label?: string, displayValue?: string) => void
  removeFilter: (key: string) => void
  clearAll: () => void
  replaceAll: (filters: Record<string, string>) => void
  filterChips: FilterValue[]
  debouncedFilters: Record<string, string>
}

export function useFilters(): UseFiltersReturn {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const [chips, setChips] = useState<FilterValue[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedFilters(activeFilters)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [activeFilters])

  const setFilter = useCallback(
    (key: string, value: string, label?: string, displayValue?: string) => {
      if (!value) {
        setActiveFilters((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
        setChips((prev) => prev.filter((c) => c.key !== key))
        return
      }
      setActiveFilters((prev) => ({ ...prev, [key]: value }))
      setChips((prev) => {
        const existing = prev.filter((c) => c.key !== key)
        return [
          ...existing,
          { key, value, label: label ?? key, displayValue: displayValue ?? value },
        ]
      })
    },
    []
  )

  const removeFilter = useCallback((key: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setChips((prev) => prev.filter((c) => c.key !== key))
  }, [])

  const clearAll = useCallback(() => {
    setActiveFilters({})
    setChips([])
  }, [])

  const replaceAll = useCallback((filters: Record<string, string>) => {
    const cleaned: Record<string, string> = {}
    const newChips: FilterValue[] = []
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue
      cleaned[key] = value
      newChips.push({ key, value, label: key, displayValue: value })
    }
    setActiveFilters(cleaned)
    setChips(newChips)
  }, [])

  return {
    activeFilters,
    setFilter,
    removeFilter,
    clearAll,
    replaceAll,
    filterChips: chips,
    debouncedFilters,
  }
}
