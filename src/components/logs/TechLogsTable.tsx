'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { TechLog } from '@/types/audit'
import { formatDateTime } from '@/lib/utils/format'

const COLUMNS = ['Fecha', 'Método', 'Ruta', 'Status', 'Duración', 'Usuario', ''] as const

function statusBadge(status: number): string {
  if (status >= 500) return 'bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-400'
  if (status >= 400) return 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
  return 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
}

function methodBadge(method: string): string {
  switch (method) {
    case 'POST':
      return 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
    case 'PUT':
    case 'PATCH':
      return 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
    case 'DELETE':
      return 'bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-400'
    default:
      return 'bg-slate-500/15 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400'
  }
}

function fmtDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`
  return `${ms} ms`
}

export function TechLogsTable({ logs }: { logs: TechLog[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="brika-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="brika-table">
          <thead>
            <tr>
              {COLUMNS.map((c, i) => (
                <th key={i}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const expanded = expandedId === log.id
              return (
                <Fragment key={log.id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setExpandedId(expanded ? null : log.id)
                    }}
                    tabIndex={0}
                    className="cursor-pointer outline-none focus-visible:bg-orange/5"
                  >
                    <td className="text-sm text-text-secondary whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${methodBadge(log.method)}`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td className="text-sm text-text-secondary font-mono max-w-[280px]">
                      <span className="block truncate" title={log.path ?? log.route}>
                        {log.route}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${statusBadge(log.status)}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="text-sm text-text-secondary whitespace-nowrap">
                      {fmtDuration(log.duration_ms)}
                    </td>
                    <td className="text-sm text-text-secondary max-w-[220px]">
                      <span className="block truncate">{log.user_email ?? '—'}</span>
                    </td>
                    <td className="w-8">
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
                      )}
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="bg-bg-tertiary/30">
                        <div className="px-1 py-2 space-y-1.5 text-sm">
                          <div className="flex gap-2">
                            <span className="font-medium text-text-primary whitespace-nowrap">Request:</span>
                            <span className="font-mono text-text-secondary break-all">
                              {log.method} {log.path ?? log.route}
                            </span>
                          </div>
                          {log.error ? (
                            <div className="flex gap-2">
                              <span className="font-medium text-text-primary whitespace-nowrap">Error:</span>
                              <span className="text-red-600 dark:text-red-400 break-words">{log.error}</span>
                            </div>
                          ) : (
                            <p className="text-text-tertiary">Sin error: registrado por ser escritura o request lento.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
