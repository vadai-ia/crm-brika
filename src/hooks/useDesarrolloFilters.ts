'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface FilterChip {
  key: string
  value: string
  label: string
  displayValue: string
}

export function useDesarrolloFilters() {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedFilters({ ...activeFilters })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [activeFilters])

  const setFilter = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => {
      if (!value) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const removeFilter = useCallback((key: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setActiveFilters({})
  }, [])

  const filterChips: FilterChip[] = Object.entries(activeFilters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      value,
      label: key,
      displayValue: value,
    }))

  return { activeFilters, debouncedFilters, filterChips, setFilter, removeFilter, clearAll }
}
