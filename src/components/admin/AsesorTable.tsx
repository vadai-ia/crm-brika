'use client'

import { useState } from 'react'
import { Check, Copy, ChevronRight } from 'lucide-react'
import type { ProfileWithAuth } from '@/types'
import { formatDateTime } from '@/lib/utils/format'
import { THEME_LABELS, roleBadgeClass } from '@/lib/utils/constants'
import { AsesorAvatar } from './AsesorAvatar'

interface AsesorTableProps {
  rows: ProfileWithAuth[]
  currentUserId: string | null
  roleLabels: Record<string, string>
  canToggle: (row: ProfileWithAuth) => boolean
  busyId: string | null
  onSelect: (row: ProfileWithAuth) => void
  onToggle: (row: ProfileWithAuth) => void
}

const COLUMNS = ['Usuario', 'Rol', 'Estado', 'Tema', 'Último acceso', 'Registro', 'Actualizado', 'ID', ''] as const

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard no disponible (http): sin feedback
    }
  }
  return (
    <button
      onClick={copy}
      title={`Copiar ${id}`}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary hover:text-orange transition-colors cursor-pointer"
    >
      {id.slice(0, 8)}…
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
        : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
    </button>
  )
}

export function AsesorTable({
  rows, currentUserId, roleLabels, canToggle, busyId, onSelect, onToggle,
}: AsesorTableProps) {
  return (
    <div className="brika-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="brika-table">
          <thead>
            <tr>
              {COLUMNS.map((c, i) => <th key={i}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelf = row.id === currentUserId
              const toggleAllowed = canToggle(row) && !isSelf
              const busy = busyId === row.id
              return (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onSelect(row) }}
                  tabIndex={0}
                  className={`cursor-pointer outline-none focus-visible:bg-orange/5 ${!row.is_active ? 'opacity-60' : ''}`}
                >
                  <td>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <AsesorAvatar name={row.full_name} url={row.avatar_url} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">{row.full_name}</span>
                          {isSelf && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange/10 text-orange">Tú</span>
                          )}
                        </div>
                        <p className="text-xs text-text-tertiary truncate">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`brika-badge ${roleBadgeClass(row.role)}`}>
                      {roleLabels[row.role] ?? row.role}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (toggleAllowed && !busy) onToggle(row) }}
                        disabled={!toggleAllowed || busy}
                        className={`brika-toggle ${row.is_active ? 'brika-toggle-on' : 'brika-toggle-off'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isSelf ? 'No puedes desactivar tu propia cuenta' : row.is_active ? 'Desactivar' : 'Activar'}
                        aria-label={row.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        <span className="brika-toggle-thumb" />
                      </button>
                      <span className={`text-xs font-medium ${row.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {row.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm text-text-secondary whitespace-nowrap">
                    {row.theme_preference ? THEME_LABELS[row.theme_preference] : '—'}
                  </td>
                  <td className="text-sm text-text-secondary whitespace-nowrap">
                    {row.last_sign_in_at ? formatDateTime(row.last_sign_in_at) : <span className="text-text-tertiary">Nunca</span>}
                  </td>
                  <td className="text-sm text-text-secondary whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                  <td className="text-sm text-text-secondary whitespace-nowrap">{formatDateTime(row.updated_at)}</td>
                  <td><CopyId id={row.id} /></td>
                  <td className="w-8">
                    <ChevronRight className="w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
