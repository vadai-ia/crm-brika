'use client'

import { History, Loader2 } from 'lucide-react'
import { useAuditLogs } from '@/hooks/useAuditLogs'
import { LogFilters } from '@/components/logs/LogFilters'
import { LogsTable } from '@/components/logs/LogsTable'

export default function LogsPage() {
  const { filters, setFilters, logs, actors, nextCursor, loading, loadingMore, error, loadMore } =
    useAuditLogs()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="brika-page-title">Logs</h1>
        <p className="brika-page-desc mt-1">
          Historial de cambios en el CRM: quién creó, editó o eliminó qué, campo por campo, y el
          detalle de cada carga masiva.
        </p>
      </div>

      <LogFilters filters={filters} onChange={setFilters} actors={actors} />

      {error && (
        <div className="brika-card px-5 py-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <p className="text-xs text-text-tertiary mt-1">
            Si el módulo es nuevo, verifica que se haya ejecutado{' '}
            <code className="font-mono">sql/010-audit-logs.sql</code> en Supabase.
          </p>
        </div>
      )}

      {loading && logs.length === 0 && !error && (
        <div className="brika-card px-5 py-10 flex items-center justify-center gap-2 text-text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
          <span className="text-sm">Cargando historial…</span>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="brika-card px-5 py-12 flex flex-col items-center gap-2 text-center">
          <History className="w-8 h-8 text-text-tertiary" strokeWidth={1.5} />
          <p className="text-sm font-medium text-text-primary">Sin registros</p>
          <p className="text-sm text-text-tertiary">
            Aquí aparecerá cada cambio que se haga en el CRM.
          </p>
        </div>
      )}

      {logs.length > 0 && <LogsTable logs={logs} />}

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
