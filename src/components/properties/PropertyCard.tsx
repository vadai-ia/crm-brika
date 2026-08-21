'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Bed, Bath, Ruler, Pencil, Trash2, FilePlus, FileCheck, FileOutput } from 'lucide-react'
import type { Property, UserRole } from '@/types'
import type { PropertyCover } from '@/types/inventario'
import { usePropertyImages } from '@/hooks/usePropertyImages'
import { usePhotoSync } from '@/hooks/usePhotoSync'
import { formatPrice, displayValue, capitalize } from '@/lib/utils/format'
import { PropertyCardCover } from './PropertyCardCover'
import { PropertyCardGallery } from './PropertyCardGallery'

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
  /** "Crear PDF": lleva al módulo de fichas con solo esta propiedad. */
  onCreatePdf?: (property: Property) => void
  /** Portada: `undefined` = cargando, `null` = sin fotos. */
  cover: PropertyCover | null | undefined
  /** Permiso `propiedades.edit`: puede ocultar/mostrar fotos en la web. */
  canEditImages?: boolean
}

export function PropertyCard({
  property,
  onClick,
  role,
  onEdit,
  onDelete,
  visibleColumnNames,
  pdfSelected,
  onTogglePdf,
  onCreatePdf,
  cover,
  canEditImages = false,
}: PropertyCardProps) {
  const isAdmin = role === 'admin'
  const show = (col: string) => isAdmin || !visibleColumnNames || visibleColumnNames.has(col)
  const [galleryOpen, setGalleryOpen] = useState(false)

  // Property.id es uuid (string) aunque el type legacy diga number (journal #12)
  const propertyId = String(property.id)
  const title = displayValue(property.nombre_kibah || property.nombre_desarrollador)

  // Ocultas: si la galería ya cargó, su estado es el más fresco; si no, el de la portada
  const { images } = usePropertyImages(propertyId)
  const hiddenCount = images ? images.filter((img) => !img.visible).length : (cover?.hidden ?? 0)
  const syncing = usePhotoSync().syncingIds.has(propertyId)

  const openDetail = () => onClick(property)
  const handleBodyKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetail()
    }
  }

  return (
    <article className="brika-card w-full overflow-hidden flex flex-col">
      {/* Portada: click despliega/oculta la galería dentro de la tarjeta */}
      <PropertyCardCover
        cover={cover}
        alt={title}
        open={galleryOpen}
        hiddenCount={hiddenCount}
        syncing={syncing}
        onToggle={() => setGalleryOpen((v) => !v)}
      />
      {galleryOpen && <PropertyCardGallery propertyId={propertyId} readOnly={!canEditImages} />}

      {/* Cuerpo: click abre el detalle */}
      <div
        role="button"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={handleBodyKey}
        className="flex-1 p-5 text-left cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-inset"
      >
        {/* Actions row — PDF + admin buttons on one line */}
        {(isAdmin || onTogglePdf || onCreatePdf) && (
          <div className="flex items-center justify-end gap-1 mb-2">
            {onCreatePdf && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreatePdf(property) }}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] text-orange bg-orange/10 hover:bg-orange hover:text-white transition-colors cursor-pointer mr-auto"
                title="Crear PDF de esta propiedad"
              >
                <FileOutput className="w-3.5 h-3.5" strokeWidth={1.5} />
                Crear PDF
              </button>
            )}
            {onTogglePdf && (
              <button
                type="button"
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
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit?.(property) }}
                  className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  type="button"
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
          <h3 className="brika-card-title mb-0.5 line-clamp-1">{title}</h3>
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
      </div>
    </article>
  )
}
