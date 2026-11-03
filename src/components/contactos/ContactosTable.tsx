'use client'

import { Fragment, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, MapPin } from 'lucide-react'
import type { ContactoParque } from '@/types/contactos'
import { formatComisionTexto } from '@/lib/utils/format'
import { ContactAvatar, EmailCell, PhoneCell, statusBadgeClass } from './ContactCells'

export type SortKey = 'parque' | 'contacto' | 'unidades' | 'comision'
export interface SortState { key: SortKey; dir: 'asc' | 'desc' }

interface ContactosTableProps {
  rows: ContactoParque[]
  sort: SortState
  onSort: (key: SortKey) => void
  onCopied: (msg: string) => void
}

const COLUMNS: { key: string; label: string; sortable?: SortKey; className?: string }[] = [
  { key: 'expand', label: '', className: 'w-10 !pr-0' },
  { key: 'parque', label: 'Parque', sortable: 'parque' },
  { key: 'contacto', label: 'Contacto', sortable: 'contacto' },
  { key: 'celular', label: 'Celular' },
  { key: 'correo', label: 'Correo' },
  { key: 'comision', label: 'Comisión', sortable: 'comision' },
  { key: 'unidades', label: 'Unidades', sortable: 'unidades', className: 'text-right' },
]

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 brika-sort-inactive" strokeWidth={2} />
  const Icon = dir === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="w-3 h-3 brika-sort-active" strokeWidth={2} />
}

export function ContactosTable({ rows, sort, onSort, onCopied }: ContactosTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="brika-card brika-card-flat overflow-hidden">
      <div className="overflow-x-auto">
        <table className="brika-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key} className={col.className}>
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.sortable!)}
                      className={`inline-flex items-center gap-1.5 uppercase tracking-wider cursor-pointer hover:text-text-primary ${
                        col.className?.includes('text-right') ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {col.label}
                      <SortIcon active={sort.key === col.sortable} dir={sort.dir} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const open = expanded.has(r.key)
              const lugar = [r.municipio, r.estado].filter(Boolean).join(', ')
              return (
                <Fragment key={r.key}>
                  <tr
                    onClick={() => toggle(r.key)}
                    className={`cursor-pointer ${open ? '!bg-orange/[0.04]' : ''}`}
                    aria-expanded={open}
                  >
                    <td className="!pr-0">
                      <ChevronRight
                        className={`w-4 h-4 text-text-tertiary transition-transform ${open ? 'rotate-90 text-orange' : ''}`}
                        strokeWidth={1.5}
                      />
                    </td>
                    <td>
                      <div className="font-medium text-text-primary whitespace-nowrap">{r.parque ?? 'Sin parque'}</div>
                      {lugar && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-text-tertiary whitespace-nowrap">
                          <MapPin className="w-3 h-3" strokeWidth={1.5} />
                          {lugar}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                        <ContactAvatar name={r.contacto} />
                        <span className="font-medium">{r.contacto ?? 'Sin nombre'}</span>
                      </div>
                    </td>
                    {/* Las acciones (llamar, copiar...) no abren/cierran la fila */}
                    <td onClick={(e) => e.stopPropagation()}><PhoneCell value={r.celular} onCopied={onCopied} /></td>
                    <td onClick={(e) => e.stopPropagation()}><EmailCell value={r.correo} onCopied={onCopied} /></td>
                    <td>
                      {r.comisiones.length === 0 ? (
                        <span className="text-text-tertiary">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.comisiones.map((c) => (
                            <span key={c} className="brika-badge brika-badge-preventa whitespace-nowrap">{formatComisionTexto(c)}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="text-right tabular-nums font-medium">{r.unidades.length}</td>
                  </tr>

                  {open && (
                    <tr className="!border-b-0 hover:!bg-transparent">
                      <td colSpan={COLUMNS.length} className="!pt-0 !pb-4 bg-orange/[0.04]">
                        <div className="ml-10">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                            Unidades que atiende ({r.unidades.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {r.unidades.map((u) => (
                              <span
                                key={u.id}
                                className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-[8px] border border-border-primary bg-card-bg text-xs"
                              >
                                <span className="font-semibold text-text-primary">{u.unidad ?? 'S/N'}</span>
                                {(u.producto || u.operacion) && (
                                  <span className="text-text-tertiary">{[u.producto, u.operacion].filter(Boolean).join(' · ')}</span>
                                )}
                                {u.estatus && (
                                  <span className={`brika-badge !py-[3px] !px-2 !text-[10px] ${statusBadgeClass(u.estatus)}`}>{u.estatus}</span>
                                )}
                              </span>
                            ))}
                          </div>
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
