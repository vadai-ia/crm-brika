'use client'

import { useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import type { Property, UserRole } from '@/types'
import { usePropertyCovers } from '@/hooks/usePropertyCovers'
import { usePhotoSync, startPhotoSync } from '@/hooks/usePhotoSync'
import { PropertyCard } from './PropertyCard'

interface PropertyGridProps {
  properties: Property[]
  loading: boolean
  onSelect: (property: Property) => void
  role?: UserRole
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
  visibleColumnNames?: Set<string>
  pdfSelectedIds?: Set<number>
  onTogglePdf?: (property: Property) => void
  /** "Crear PDF": lleva al módulo de fichas con solo esa propiedad. */
  onCreatePdf?: (property: Property) => void
  /** Permiso `propiedades.edit`: puede ocultar/mostrar fotos en la web. */
  canEditImages?: boolean
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-card-border bg-card-bg overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-bg-tertiary" />
      <div className="p-5">
        <div className="flex gap-2 mb-3">
          <div className="h-5 w-20 bg-bg-tertiary rounded-full" />
          <div className="h-5 w-24 bg-bg-tertiary rounded-full" />
        </div>
        <div className="h-4 w-3/4 bg-bg-tertiary rounded mb-1" />
        <div className="h-3 w-1/2 bg-bg-tertiary rounded mb-3" />
        <div className="h-6 w-2/3 bg-bg-tertiary rounded mb-4" />
        <div className="flex gap-4">
          <div className="h-4 w-10 bg-bg-tertiary rounded" />
          <div className="h-4 w-10 bg-bg-tertiary rounded" />
          <div className="h-4 w-14 bg-bg-tertiary rounded" />
        </div>
      </div>
    </div>
  )
}

/** Aviso de importación de fotos en curso (el navegador va pidiendo pasos al servidor). */
function PhotoSyncBanner() {
  const { running, current, queued, errors } = usePhotoSync()
  if (!running && errors.length === 0) return null
  return (
    <div className="mb-4 space-y-2">
      {running && current && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-sm)] bg-orange/10 border border-orange/20 text-sm text-text-primary">
          <Loader2 className="w-4 h-4 animate-spin text-orange flex-shrink-0" strokeWidth={1.5} />
          <span className="flex-1">
            Importando fotos de <strong>{current.title ?? `set ${current.setId}`}</strong>
            {current.total > 0 && ` (${current.done}/${current.total})`}
            {queued > 0 && <span className="text-text-secondary"> · {queued} carpeta{queued !== 1 ? 's' : ''} en cola</span>}
          </span>
        </div>
      )}
      {errors.map((e) => (
        <div key={e} className="flex items-start gap-3 px-4 py-2.5 rounded-[var(--radius-sm)] bg-warning/10 border border-warning/30 text-sm text-text-primary">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{e}</span>
        </div>
      ))}
    </div>
  )
}

export function PropertyGrid({ properties, loading, onSelect, role, onEdit, onDelete, visibleColumnNames, pdfSelectedIds, onTogglePdf, onCreatePdf, canEditImages }: PropertyGridProps) {
  // Portadas (cache por pestaña, lotes de 50)
  const covers = usePropertyCovers(properties)

  // Al abrir Propiedades: revisa el inventario e importa las fotos que falten
  useEffect(() => {
    startPhotoSync()
  }, [])

  if (loading && properties.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <PhotoSyncBanner />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onClick={onSelect}
            role={role}
            onEdit={onEdit}
            onDelete={onDelete}
            visibleColumnNames={visibleColumnNames}
            pdfSelected={pdfSelectedIds?.has(property.id)}
            onTogglePdf={onTogglePdf}
            onCreatePdf={onCreatePdf}
            cover={covers[String(property.id)]}
            canEditImages={canEditImages}
          />
        ))}
      </div>
    </div>
  )
}
