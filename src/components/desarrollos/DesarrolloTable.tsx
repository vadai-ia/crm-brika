'use client'

import { Pencil, Trash2 } from 'lucide-react'
import type { Desarrollo } from '@/types/desarrollo'
function disponibilidadBadgeClass(value: string): string {
  const v = value.toLowerCase()
  if (v.includes('dispon')) return 'brika-badge brika-badge-disponible'
  if (v.includes('apart')) return 'brika-badge brika-badge-apartado'
  if (v.includes('rent')) return 'brika-badge brika-badge-rentado'
  return 'brika-badge brika-badge-disponible'
}
import { toTitleCase } from '@/lib/utils/format'

interface DesarrolloTableProps {
  desarrollos: Desarrollo[]
  loading: boolean
  onSelect: (d: Desarrollo) => void
  onEdit?: (d: Desarrollo) => void
  onDelete?: (d: Desarrollo) => void
}

function formatPriceShort(min: number | null, max: number | null): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
    return `$${n}`
  }
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`
  if (min && max) return fmt(min)
  if (min) return fmt(min)
  if (max) return fmt(max)
  return '—'
}

function formatRange(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `${min}-${max}`
  if (min) return String(min)
  if (max) return String(max)
  return '—'
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border-primary">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-bg-tertiary rounded animate-pulse w-3/4" /></td>
      ))}
    </tr>
  )
}

export function DesarrolloTable({ desarrollos, loading, onSelect, onEdit, onDelete }: DesarrolloTableProps) {
  if (loading && desarrollos.length === 0) {
    return (
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border-primary">
        <table className="brika-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Colonia</th>
              <th>Precio</th>
              <th>Recámaras</th>
              <th>Disponibilidad</th>
              <th>Preventa</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border-primary">
      <table className="brika-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Colonia</th>
            <th>Precio</th>
            <th>Recámaras</th>
            <th>Disponibilidad</th>
            <th>Preventa</th>
            <th className="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {desarrollos.map((d) => {
            return (
              <tr key={d.id} onClick={() => onSelect(d)} className="cursor-pointer group">
                <td className="whitespace-nowrap max-w-[200px] truncate">
                  <div className="flex items-center gap-2">
                    {d.imagen_principal ? (
                      <img src={d.imagen_principal} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-bg-tertiary flex-shrink-0" />
                    )}
                    <span className="truncate">{d.nombre_kibah || d.nombre_desarrollador || '—'}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap">{toTitleCase(d.colonia)}</td>
                <td className="whitespace-nowrap brika-table-price">{formatPriceShort(d.precio_min, d.precio_max)}</td>
                <td className="whitespace-nowrap">{formatRange(d.recamaras_min, d.recamaras_max)}</td>
                <td className="whitespace-nowrap">
                  {d.disponibilidad ? (
                    <span className={disponibilidadBadgeClass(d.disponibilidad)}>{d.disponibilidad}</span>
                  ) : '—'}
                </td>
                <td className="whitespace-nowrap">{toTitleCase(d.tipo_preventa)}</td>
                <td className="text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 md:transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit?.(d) }} className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer" title="Editar">
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete?.(d) }} className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
