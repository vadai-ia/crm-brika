'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { AuditLog } from '@/types/audit'
import { formatDateTime } from '@/lib/utils/format'
import {
  AUDIT_ACTION_COLORS,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from '@/lib/utils/constants'
import { LogChanges } from './LogChanges'

const COLUMNS = ['Fecha', 'Usuario', 'Acción', 'Módulo', 'Detalle', ''] as const

function ActionBadge({ action }: { action: string }) {
  const colors = AUDIT_ACTION_COLORS[action] ?? {
    bg: 'bg-slate-500/15',
    text: 'text-slate-700 dark:text-slate-400',
  }
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${colors.bg} ${colors.text}`}
    >
      {AUDIT_ACTION_LABELS[action] ?? action}
    </span>
  )
}

/** Resumen corto del detalle en la fila colapsada. */
function detailSummary(log: AuditLog): string {
  const label = log.entity_label ?? ''
  const count = log.changes ? Object.keys(log.changes).length : 0
  if (count > 0) {
    return label
      ? `${label} — ${count} campo${count === 1 ? '' : 's'}`
      : `${count} campo${count === 1 ? '' : 's'}`
  }
  return label || '—'
}

export function LogsTable({ logs }: { logs: AuditLog[] }) {
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
                      <div className="min-w-[160px]">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {log.actor_name ?? 'Sistema'}
                        </p>
                        {log.actor_email && (
                          <p className="text-xs text-text-tertiary truncate">{log.actor_email}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="text-sm text-text-secondary whitespace-nowrap">
                      {AUDIT_ENTITY_LABELS[log.entity] ?? log.entity}
                    </td>
                    <td className="text-sm text-text-secondary max-w-[360px]">
                      <span className="block truncate">{detailSummary(log)}</span>
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
                        <div className="px-1 py-2">
                          <LogChanges log={log} />
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
