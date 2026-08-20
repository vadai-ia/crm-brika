'use client'

import { Search, X } from 'lucide-react'
import type { Role } from '@/types/roles'

export type StatusFilter = 'all' | 'active' | 'inactive'

export interface AsesorStats {
  loaded: number
  activos: number
  inactivos: number
  admins: number
  hasMore: boolean
}

interface AsesorToolbarProps {
  query: string
  onQuery: (value: string) => void
  role: string
  onRole: (value: string) => void
  status: StatusFilter
  onStatus: (value: StatusFilter) => void
  roles: Role[]
  stats: AsesorStats
}

const SELECT_CLASS =
  'h-10 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary cursor-pointer focus:outline-none focus:border-orange'

function StatChip({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="brika-card brika-card-flat px-4 py-2.5 min-w-[110px]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className={`text-xl font-semibold leading-tight ${accent ?? 'text-text-primary'}`}>{value}</p>
    </div>
  )
}

export function AsesorToolbar({
  query, onQuery, role, onRole, status, onStatus, roles, stats,
}: AsesorToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <StatChip label={stats.hasMore ? 'Cargados' : 'Usuarios'} value={stats.loaded} />
        <StatChip label="Activos" value={stats.activos} accent="text-emerald-600 dark:text-emerald-400" />
        <StatChip label="Inactivos" value={stats.inactivos} accent="text-red-600 dark:text-red-400" />
        <StatChip label="Admins" value={stats.admins} accent="text-orange" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar por nombre, email, rol o ID…"
            className="brika-input"
            style={{ paddingLeft: '36px', paddingRight: '32px' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary hover:text-text-primary"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <select value={role} onChange={(e) => onRole(e.target.value)} className={SELECT_CLASS} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.name} value={r.name}>{r.display_name}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as StatusFilter)}
          className={SELECT_CLASS}
          aria-label="Filtrar por estado"
        >
          <option value="all">Activos e inactivos</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>
      </div>
    </div>
  )
}
