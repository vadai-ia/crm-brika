'use client'

import type { Property, UserRole } from '@/types'
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
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-card-border bg-card-bg p-5 animate-pulse">
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
  )
}

export function PropertyGrid({ properties, loading, onSelect, role, onEdit, onDelete, visibleColumnNames, pdfSelectedIds, onTogglePdf }: PropertyGridProps) {
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
        />
      ))}
    </div>
  )
}
