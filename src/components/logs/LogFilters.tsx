'use client'

import { Search, X } from 'lucide-react'
import type { AuditActor } from '@/types/audit'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from '@/lib/utils/constants'
import { EMPTY_LOG_FILTERS, type LogFiltersState } from '@/hooks/useAuditLogs'

const SELECT_CLASS =
  'h-10 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary cursor-pointer focus:outline-none focus:border-orange'

interface LogFiltersProps {
  filters: LogFiltersState
  onChange: (filters: LogFiltersState) => void
  actors: AuditActor[]
}

export function LogFilters({ filters, onChange, actors }: LogFiltersProps) {
  const set = (patch: Partial<LogFiltersState>) => onChange({ ...filters, ...patch })
  const hasFilters =
    filters.entity !== '' || filters.action !== '' || filters.actor !== '' || filters.q !== ''

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
          placeholder="Buscar por detalle o usuario…"
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
        value={filters.entity}
        onChange={(e) => set({ entity: e.target.value })}
        className={SELECT_CLASS}
        aria-label="Filtrar por módulo"
      >
        <option value="">Todos los módulos</option>
        {Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        value={filters.action}
        onChange={(e) => set({ action: e.target.value })}
        className={SELECT_CLASS}
        aria-label="Filtrar por acción"
      >
        <option value="">Todas las acciones</option>
        {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        value={filters.actor}
        onChange={(e) => set({ actor: e.target.value })}
        className={SELECT_CLASS}
        aria-label="Filtrar por usuario"
      >
        <option value="">Todos los usuarios</option>
        {actors.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_LOG_FILTERS)}
          className="h-10 px-3 text-sm font-medium rounded-[var(--radius-sm)] text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
