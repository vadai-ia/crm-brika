'use client'

import { Bed, Bath, Ruler, Pencil, Trash2, FilePlus, FileCheck } from 'lucide-react'
import type { Property, UserRole } from '@/types'
import { formatPrice, displayValue } from '@/lib/utils/format'
import { capitalize } from '@/lib/utils/format'

function disponibilidadBadge(value: string | null | undefined): string {
  if (!value) return ''
  const v = value.toLowerCase()
  if (v.includes('dispon')) return 'brika-badge brika-badge-disponible'
  if (v.includes('apart')) return 'brika-badge brika-badge-apartado'
  if (v.includes('rent')) return 'brika-badge brika-badge-rentado'
  return 'brika-badge brika-badge-disponible'
}

function preventaBadge(value: string | null | undefined): string {
  if (!value) return ''
  const v = value.toLowerCase()
  if (v.includes('inmediata')) return 'brika-badge brika-badge-entrega'
  return 'brika-badge brika-badge-preventa'
}

interface PropertyCardProps {
  property: Property
  onClick: (property: Property) => void
  role?: UserRole
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
  visibleColumnNames?: Set<string>
  pdfSelected?: boolean
  onTogglePdf?: (property: Property) => void
}

export function PropertyCard({ property, onClick, role, onEdit, onDelete, visibleColumnNames, pdfSelected, onTogglePdf }: PropertyCardProps) {
  const isAdmin = role === 'admin'
  const show = (col: string) => isAdmin || !visibleColumnNames || visibleColumnNames.has(col)

  return (
    <button
      onClick={() => onClick(property)}
      className="brika-card w-full text-left group p-5 cursor-pointer"
    >
      {/* Admin actions */}
      {/* Actions row — PDF + admin buttons on one line */}
      {(isAdmin || onTogglePdf) && (
        <div className="flex items-center justify-end gap-1 mb-2">
          {onTogglePdf && (
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePdf(property) }}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer
                ${pdfSelected ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-text-tertiary hover:text-orange hover:bg-orange/10'}`}
              title={pdfSelected ? 'En PDF' : 'Agregar al PDF'}
            >
              {pdfSelected ? <FileCheck className="w-4 h-4" strokeWidth={1.5} /> : <FilePlus className="w-4 h-4" strokeWidth={1.5} />}
            </button>
          )}
          {isAdmin && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit?.(property) }}
                className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer"
                title="Editar"
              >
                <Pencil className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(property) }}
                className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {show('disponibilidad') && property.disponibilidad && (
          <span className={disponibilidadBadge(property.disponibilidad)}>
            {property.disponibilidad}
          </span>
        )}
        {show('tipo_preventa') && property.tipo_preventa && (
          <span className={preventaBadge(property.tipo_preventa)}>
            {capitalize(property.tipo_preventa)}
          </span>
        )}
      </div>

      {/* Title */}
      {show('nombre_kibah') && (
        <h3 className="brika-card-title mb-0.5 line-clamp-1">
          {displayValue(property.nombre_kibah || property.nombre_desarrollador)}
        </h3>
      )}
      {show('unidad') && property.unidad && (
        <p className="text-[12px] text-text-tertiary mb-1">{property.unidad}</p>
      )}
      {(show('colonia') || show('alcaldia')) && (
        <p className="brika-card-location mb-3">
          {show('colonia') ? displayValue(property.colonia) : ''}
          {show('alcaldia') && property.alcaldia ? `, ${property.alcaldia}` : ''}
        </p>
      )}

      {/* Price */}
      {show('precio_unidad') && (
        <p className="brika-card-price mb-4">
          {formatPrice(property.precio_unidad)}
        </p>
      )}

      {/* Features */}
      <div className="flex items-center gap-4">
        {show('num_recamaras') && property.num_recamaras && (
          <span className="brika-card-spec">
            <Bed className="w-[14px] h-[14px]" strokeWidth={1.5} />
            {property.num_recamaras}
          </span>
        )}
        {show('num_banos') && property.num_banos && (
          <span className="brika-card-spec">
            <Bath className="w-[14px] h-[14px]" strokeWidth={1.5} />
            {property.num_banos}
          </span>
        )}
        {show('m2_totales') && property.m2_totales && (
          <span className="brika-card-spec">
            <Ruler className="w-[14px] h-[14px]" strokeWidth={1.5} />
            {property.m2_totales} m²
          </span>
        )}
      </div>
    </button>
  )
}
