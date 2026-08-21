'use client'

import { useEffect } from 'react'
import { AlertCircle, ImageOff } from 'lucide-react'
import {
  usePropertyImages,
  loadPropertyImages,
  setImagesVisibility,
  reorderImages,
  setCoverImage,
} from '@/hooks/usePropertyImages'
import { useDragReorder } from '@/hooks/useDragReorder'
import { PropertyImageTile } from './PropertyImageTile'

interface PropertyCardGalleryProps {
  propertyId: string
  /** Sin permiso `propiedades.edit`: se ve el estado de cada foto pero no se puede cambiar. */
  readOnly?: boolean
}

const WRAP = 'px-3 py-3 border-b border-border-primary'
const TOOL_BTN =
  'text-text-secondary hover:text-orange transition-colors cursor-pointer disabled:opacity-40 disabled:hover:text-text-secondary disabled:cursor-default'

/**
 * Fotos de la propiedad dentro de la tarjeta: palomita = visible en la web
 * (un click la oculta, otro la muestra), arrastrar = reordenar, estrella =
 * hacer portada. La #1 visible es la portada en el CRM y en la web.
 */
export function PropertyCardGallery({ propertyId, readOnly = false }: PropertyCardGalleryProps) {
  const { images, loading, error, pending, saveError } = usePropertyImages(propertyId)
  const names = (images ?? []).map((img) => img.name)
  const drag = useDragReorder(names, (next) => void reorderImages(propertyId, next), !readOnly)

  // Carga inicial y recarga cuando photo-sync invalida las fotos (images vuelve a null)
  useEffect(() => {
    if (images === null && !loading && !error) loadPropertyImages(propertyId)
  }, [propertyId, images, loading, error])

  if (error) {
    return (
      <div className={`${WRAP} flex items-center gap-2 text-xs text-error`}>
        <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
        <span className="flex-1">{error}</span>
        <button type="button" onClick={() => loadPropertyImages(propertyId, true)} className="font-medium hover:underline cursor-pointer">
          Reintentar
        </button>
      </div>
    )
  }

  if (images === null) {
    return (
      <div className={`${WRAP} grid grid-cols-3 gap-2`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-[var(--radius-sm)] bg-bg-tertiary animate-pulse" />
        ))}
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className={`${WRAP} flex items-center gap-2 text-xs text-text-tertiary`}>
        <ImageOff className="w-4 h-4" strokeWidth={1.5} />
        Este set no tiene fotos
      </div>
    )
  }

  const hiddenCount = images.filter((img) => !img.visible).length
  const coverName = images.find((img) => img.visible)?.name ?? images[0].name
  const saving = pending > 0

  return (
    <div className={WRAP}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-text-secondary">
          {images.length} foto{images.length !== 1 ? 's' : ''}
          {hiddenCount > 0 && (
            <span className="text-warning font-medium">
              {' · '}
              {hiddenCount} oculta{hiddenCount !== 1 ? 's' : ''} en la web
            </span>
          )}
        </p>
        {!readOnly && (
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <button type="button" onClick={() => void setImagesVisibility(propertyId, names, true)} disabled={saving || hiddenCount === 0} className={TOOL_BTN}>
              Mostrar todas
            </button>
            <span className="text-text-tertiary">·</span>
            <button type="button" onClick={() => void setImagesVisibility(propertyId, names, false)} disabled={saving || hiddenCount === images.length} className={TOOL_BTN}>
              Ocultar todas
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <p className="flex items-center gap-1.5 text-[11px] text-error mb-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          No se pudo guardar: {saveError}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {images.map((img, i) => (
          <PropertyImageTile
            key={img.name}
            img={img}
            position={i + 1}
            isCover={img.name === coverName}
            readOnly={readOnly}
            dragging={drag.dragging === img.name}
            over={drag.over === img.name}
            dragProps={drag.props(img.name)}
            title={readOnly
              ? (img.visible ? 'Visible en la web' : 'Oculta en la web')
              : (img.visible ? 'Click: ocultar en la web · Arrastra: cambiar orden' : 'Click: mostrar en la web · Arrastra: cambiar orden')}
            onClick={() => { if (!readOnly) void setImagesVisibility(propertyId, [img.name], !img.visible) }}
            onMakeCover={() => void setCoverImage(propertyId, img.name)}
          />
        ))}
      </div>

      {!readOnly && images.length > 1 && (
        <p className="mt-2 text-[10.5px] text-text-tertiary">Arrastra para cambiar el orden · la #1 visible es la portada en el CRM y en la web.</p>
      )}
    </div>
  )
}
