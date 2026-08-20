'use client'

import type { Desarrollo } from '@/types/desarrollo'
import { DesarrolloCard } from './DesarrolloCard'

interface DesarrolloGridProps {
  desarrollos: Desarrollo[]
  loading: boolean
  onSelect: (d: Desarrollo) => void
  onEdit?: (d: Desarrollo) => void
  onDelete?: (d: Desarrollo) => void
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-card-border bg-card-bg overflow-hidden animate-pulse">
      <div className="w-full h-36 bg-bg-tertiary" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 bg-bg-tertiary rounded" />
        <div className="h-3 w-1/2 bg-bg-tertiary rounded" />
        <div className="h-5 w-2/3 bg-bg-tertiary rounded" />
      </div>
    </div>
  )
}

export function DesarrolloGrid({ desarrollos, loading, onSelect, onEdit, onDelete }: DesarrolloGridProps) {
  if (loading && desarrollos.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {desarrollos.map((d) => (
        <DesarrolloCard key={d.id} desarrollo={d} onClick={onSelect} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
