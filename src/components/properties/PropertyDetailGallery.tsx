'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Eye, EyeOff, ImageOff, Star } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import {
  usePropertyImages,
  loadPropertyImages,
  setImagesVisibility,
  reorderImages,
  setCoverImage,
} from '@/hooks/usePropertyImages'
import { useDragReorder } from '@/hooks/useDragReorder'
import { PropertyImageTile } from './PropertyImageTile'

interface PropertyDetailGalleryProps {
  propertyId: string
}

const NAV_BTN =
  'absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/45 text-white hover:bg-black/70 transition-colors cursor-pointer'
const ACTION_BTN =
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-secondary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:text-text-secondary disabled:hover:bg-bg-tertiary'

/**
 * Galería del detalle: visor grande con la foto seleccionada y tira de
 * miniaturas en el orden de la web. Con permiso de edición se puede hacer
 * portada, ocultar/mostrar y arrastrar para reordenar.
 */
export function PropertyDetailGallery({ propertyId }: PropertyDetailGalleryProps) {
  const { can } = usePermissions()
  const readOnly = !can('propiedades.edit')
  const { images, loading, error, pending, saveError } = usePropertyImages(propertyId)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const names = (images ?? []).map((img) => img.name)
  const drag = useDragReorder(names, (next) => void reorderImages(propertyId, next), !readOnly)

  useEffect(() => {
    if (images === null && !loading && !error) loadPropertyImages(propertyId)
  }, [propertyId, images, loading, error])

  if (error) {
    return (
      <div className="mb-5 flex items-center gap-2 text-sm text-error">
        <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
        <span className="flex-1">{error}</span>
        <button type="button" onClick={() => loadPropertyImages(propertyId, true)} className="font-medium hover:underline cursor-pointer">
          Reintentar
        </button>
      </div>
    )
  }

  if (images === null) {
    return <div className="mb-5 aspect-[16/9] rounded-[var(--radius-lg)] bg-bg-tertiary animate-pulse" aria-hidden />
  }

  if (images.length === 0) {
    return (
      <div className="mb-5 flex items-center gap-2 text-sm text-text-tertiary">
        <ImageOff className="w-4 h-4" strokeWidth={1.5} />
        Esta propiedad no tiene fotos
      </div>
    )
  }

  const coverName = images.find((img) => img.visible)?.name ?? images[0].name
  const index = Math.max(0, images.findIndex((img) => img.name === (selectedName ?? coverName)))
  const current = images[index]
  const hiddenCount = images.filter((img) => !img.visible).length
  const saving = pending > 0
  const go = (delta: number) => setSelectedName(images[(index + delta + images.length) % images.length].name)

  return (
    <section className="mb-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
          Fotos <span className="font-normal normal-case tracking-normal">· {images.length}</span>
          {hiddenCount > 0 && <span className="font-normal normal-case tracking-normal text-warning"> · {hiddenCount} oculta{hiddenCount !== 1 ? 's' : ''} en la web</span>}
        </h3>
        <span className="text-xs text-text-tertiary tabular-nums">{index + 1} / {images.length}</span>
      </div>

      <div className="relative aspect-[16/9] rounded-[var(--radius-lg)] overflow-hidden bg-bg-tertiary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.name}
          src={current.url}
          alt={current.name}
          className={`w-full h-full object-contain ${current.visible ? '' : 'grayscale opacity-60'}`}
        />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className={`${NAV_BTN} left-2`} aria-label="Anterior">
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <button type="button" onClick={() => go(1)} className={`${NAV_BTN} right-2`} aria-label="Siguiente">
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {current.name === coverName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange text-white text-[11px] font-semibold">
              <Star className="w-3 h-3" strokeWidth={2} fill="currentColor" /> Portada
            </span>
          )}
          {!current.visible && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium">
              <EyeOff className="w-3 h-3" strokeWidth={2} /> Oculta en la web
            </span>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={() => void setCoverImage(propertyId, current.name)} disabled={saving || current.name === coverName || !current.visible} className={ACTION_BTN}>
            <Star className="w-3.5 h-3.5" strokeWidth={1.5} /> Hacer portada
          </button>
          <button type="button" onClick={() => void setImagesVisibility(propertyId, [current.name], !current.visible)} disabled={saving} className={ACTION_BTN}>
            {current.visible ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />}
            {current.visible ? 'Ocultar en la web' : 'Mostrar en la web'}
          </button>
          {saveError && (
            <span className="flex items-center gap-1 text-xs text-error">
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.5} /> {saveError}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <PropertyImageTile
            key={img.name}
            img={img}
            position={i + 1}
            isCover={img.name === coverName}
            readOnly={readOnly}
            selected={img.name === current.name}
            compact
            dragging={drag.dragging === img.name}
            over={drag.over === img.name}
            dragProps={drag.props(img.name)}
            title={readOnly ? img.name : `${img.name} · Arrastra para cambiar el orden`}
            onClick={() => setSelectedName(img.name)}
          />
        ))}
      </div>
      {!readOnly && images.length > 1 && (
        <p className="mt-1.5 text-[11px] text-text-tertiary">Arrastra las miniaturas para cambiar el orden · la #1 visible es la portada en el CRM y en la web.</p>
      )}
    </section>
  )
}
