'use client'

import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Check } from 'lucide-react'
import type { Property, UserRole, ColumnVisibility } from '@/types'
import { formatPrice, formatM2, displayValue, capitalize, formatComision } from '@/lib/utils/format'

function disponibilidadBadgeClass(value: string): string {
  const v = value.toLowerCase()
  if (v.includes('dispon')) return 'brika-badge brika-badge-disponible'
  if (v.includes('apart')) return 'brika-badge brika-badge-apartado'
  if (v.includes('rent')) return 'brika-badge brika-badge-rentado'
  return 'brika-badge brika-badge-disponible'
}

interface PropertyTableProps {
  properties: Property[]
  loading: boolean
  columns: ColumnVisibility[]
  sortConfig: { column: string; order: 'asc' | 'desc' }
  onSort: (column: string) => void
  onSelect: (property: Property) => void
  role?: UserRole
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
  visibleColumnNames?: Set<string>
  pdfSelectedIds?: Set<number>
  onTogglePdf?: (property: Property) => void
}

function formatCell(columnName: string, value: unknown, property: Property): React.ReactNode {
  const str = value as string | number | null

  switch (columnName) {
    case 'nombre_kibah':
      return displayValue((property.nombre_kibah || property.nombre_desarrollador) as string | null)
    case 'precio_unidad':
      return <span className="brika-table-price">{formatPrice(str)}</span>
    case 'm2_totales':
    case 'm2_habitables':
    case 'm2_exteriores':
    case 'm2_roof_garden':
      return formatM2(str)
    case 'pct_comision':
      return formatComision(str as number | null)
    case 'tipo_preventa':
      return capitalize(str as string | null)
    case 'disponibilidad': {
      if (!str) return '—'
      return (
        <span className={disponibilidadBadgeClass(str as string)}>
          {str as string}
        </span>
      )
    }
    default:
      return displayValue(str)
  }
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border-primary">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-bg-tertiary rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  )
}

const TABLE_COLUMNS: { column_name: string; display_label: string }[] = [
  { column_name: 'nombre_kibah', display_label: 'Parque' },
  { column_name: 'unidad', display_label: 'Unidad' },
  { column_name: 'tipo_preventa', display_label: 'Operación' },
  { column_name: 'precio_unidad', display_label: 'Precio' },
  { column_name: 'colonia', display_label: 'Zona / Corredor' },
  { column_name: 'alcaldia', display_label: 'Municipio' },
  { column_name: 'm2_totales', display_label: 'M² Terreno' },
  { column_name: 'm2_habitables', display_label: 'M² Construcción' },
  { column_name: 'disponibilidad', display_label: 'Estatus' },
]

export function PropertyTable({
  properties,
  loading,
  sortConfig,
  onSort,
  onSelect,
  role,
  onEdit,
  onDelete,
  visibleColumnNames,
  pdfSelectedIds,
  onTogglePdf,
}: PropertyTableProps) {
  const isAdmin = role === 'admin'
  const visibleCols = visibleColumnNames && !isAdmin
    ? TABLE_COLUMNS.filter((c) => visibleColumnNames.has(c.column_name))
    : TABLE_COLUMNS

  if (loading && properties.length === 0) {
    return (
      <div className="overflow-x-auto rounded-[12px] border border-border-primary">
        <table className="brika-table">
          <thead>
            <tr>
              {visibleCols.map((col) => (
                <th key={col.column_name}>{col.display_label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} cols={visibleCols.length} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[12px] border border-border-primary">
      <table className="brika-table">
        <thead>
          <tr>
            {onTogglePdf && (
              <th style={{ width: '40px' }}>PDF</th>
            )}
            {visibleCols.map((col) => {
              const isSorted = sortConfig.column === col.column_name
              return (
                <th
                  key={col.column_name}
                  className="cursor-pointer select-none"
                  onClick={() => onSort(col.column_name)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.display_label}
                    {isSorted ? (
                      sortConfig.order === 'asc' ? (
                        <ArrowUp className="w-3 h-3 brika-sort-active" />
                      ) : (
                        <ArrowDown className="w-3 h-3 brika-sort-active" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 brika-sort-inactive" />
                    )}
                  </span>
                </th>
              )
            })}
            {isAdmin && (
              <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary w-24">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr
              key={property.id}
              onClick={() => onSelect(property)}
              className={`cursor-pointer group ${pdfSelectedIds?.has(property.id) ? 'bg-orange/5' : ''}`}
            >
              {onTogglePdf && (
                <td className="px-3 py-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePdf(property) }}
                    className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors
                      ${pdfSelectedIds?.has(property.id) ? 'bg-orange border-orange' : 'border-border-primary hover:border-orange/50'}`}
                  >
                    {pdfSelectedIds?.has(property.id) && <Check className="w-3 h-3 text-white" strokeWidth={2} />}
                  </button>
                </td>
              )}
              {visibleCols.map((col) => (
                <td
                  key={col.column_name}
                  className="whitespace-nowrap max-w-[200px] truncate"
                >
                  {formatCell(
                    col.column_name,
                    property[col.column_name as keyof Property],
                    property
                  )}
                </td>
              ))}
              {isAdmin && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 md:transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit?.(property) }}
                      className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete?.(property) }}
                      className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
