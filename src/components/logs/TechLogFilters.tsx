'use client'

import { Search, X } from 'lucide-react'
import type { TechStatusFilter } from '@/types/audit'
import { EMPTY_TECH_FILTERS, type TechFiltersState } from '@/hooks/useTechLogs'

const SELECT_CLASS =
  'h-10 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary cursor-pointer focus:outline-none focus:border-orange'

const STATUS_OPTIONS: { value: TechStatusFilter; label: string }[] = [
  { value: '', label: 'Todos los status' },
  { value: 'errors', label: 'Solo errores (4xx y 5xx)' },
  { value: '4xx', label: 'Errores 4xx' },
  { value: '5xx', label: 'Errores 5xx' },
  { value: 'slow', label: 'Lentos (> 2 s)' },
]

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

interface TechLogFiltersProps {
  filters: TechFiltersState
  onChange: (filters: TechFiltersState) => void
}

export function TechLogFilters({ filters, onChange }: TechLogFiltersProps) {
  const set = (patch: Partial<TechFiltersState>) => onChange({ ...filters, ...patch })
  const hasFilters = filters.status !== '' || filters.method !== '' || filters.q !== ''

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3">
      <div className="relative w-full sm:w-72">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
          strokeWidth={1.5}
        />
        <input
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Buscar por ruta, error o usuario…"
          className="brika-input"
          style={{ paddingLeft: '36px', paddingRight: '32px' }}
        />
        {filters.q && (
          <button
            type="button"
            onClick={() => set({ q: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary hover:text-text-primary"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <select
        value={filters.status}
        onChange={(e) => set({ status: e.target.value as TechStatusFilter })}
        className={SELECT_CLASS}
        aria-label="Filtrar por status"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.method}
        onChange={(e) => set({ method: e.target.value })}
        className={SELECT_CLASS}
        aria-label="Filtrar por método"
      >
        <option value="">Todos los métodos</option>
        {METHOD_OPTIONS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_TECH_FILTERS)}
          className="h-10 px-3 text-sm font-medium rounded-[var(--radius-sm)] text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
