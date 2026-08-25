'use client'

import { Activity, Loader2 } from 'lucide-react'
import { useTechLogs } from '@/hooks/useTechLogs'
import { TechLogFilters } from './TechLogFilters'
import { TechLogsTable } from './TechLogsTable'

/** Pestaña "Técnicos": requests de la API (errores, escrituras y lentos). */
export function TechLogsTab() {
  const { filters, setFilters, logs, nextCursor, loading, loadingMore, error, loadMore } =
    useTechLogs()

  return (
    <div className="space-y-4">
      <TechLogFilters filters={filters} onChange={setFilters} />

      {error && (
        <div className="brika-card px-5 py-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-text-tertiary mt-1">
            Si la pestaña es nueva, verifica que se haya ejecutado{' '}
            <code className="font-mono">sql/011-technical-logs.sql</code> en Supabase.
          </p>
        </div>
      )}

      {loading && logs.length === 0 && !error && (
        <div className="brika-card px-5 py-10 flex items-center justify-center gap-2 text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
          <span className="text-sm">Cargando logs técnicos…</span>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="brika-card px-5 py-12 flex flex-col items-center gap-2 text-center">
          <Activity className="w-8 h-8 text-text-tertiary" strokeWidth={1.5} />
          <p className="text-sm font-medium text-text-primary">Sin registros</p>
          <p className="text-sm text-text-tertiary">
            Aquí aparecerán los errores de la API, las escrituras y los requests lentos.
          </p>
        </div>
      )}

      {logs.length > 0 && <TechLogsTable logs={logs} />}

      {nextCursor && !error && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-border-primary
              text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingMore ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </div>
  )
}
