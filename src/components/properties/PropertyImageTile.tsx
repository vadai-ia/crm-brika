'use client'

import type { KeyboardEvent } from 'react'
import { Check, EyeOff, Maximize2, Star } from 'lucide-react'
import type { PropertyImage } from '@/types/inventario'
import type { DragReorderProps } from '@/hooks/useDragReorder'

interface PropertyImageTileProps {
  img: PropertyImage
  /** Posición 1-based en el orden actual. */
  position: number
  /** Es la #1 visible: portada en el CRM y en la web. */
  isCover: boolean
  readOnly: boolean
  /** Resaltada (galería del detalle). */
  selected?: boolean
  /** Versión chica para la tira de miniaturas. */
  compact?: boolean
  dragging?: boolean
  over?: boolean
  dragProps?: DragReorderProps
  title?: string
  onClick: () => void
  onMakeCover?: () => void
}

function activate(e: KeyboardEvent<HTMLElement>, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

/** Miniatura con estado (visible/oculta), número de orden, portada y acciones al pasar el mouse. */
export function PropertyImageTile({
  img,
  position,
  isCover,
  readOnly,
  selected = false,
  compact = false,
  dragging = false,
  over = false,
  dragProps,
  title,
  onClick,
  onMakeCover,
}: PropertyImageTileProps) {
  const ring = selected || over ? 'ring-2 ring-orange' : 'ring-1 ring-border-primary hover:ring-orange/60'
  return (
    <div
      role="button"
      aria-label={`${img.name}${img.visible ? '' : ' (oculta)'}${isCover ? ', portada' : ''}`}
      aria-pressed={selected}
      tabIndex={readOnly && !onClick ? -1 : 0}
      title={title}
      onClick={onClick}
      onKeyDown={(e) => activate(e, onClick)}
      {...dragProps}
      className={`relative aspect-square rounded-[var(--radius-sm)] overflow-hidden bg-bg-tertiary group/tile select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-orange transition-[box-shadow,opacity]
        ${dragProps?.draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${dragging ? 'opacity-40' : ''} ${over ? 'scale-[0.97]' : ''} ${ring}
        ${compact ? 'w-16 flex-shrink-0' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.thumbUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={(e) => {
          if (e.currentTarget.src !== img.url) e.currentTarget.src = img.url
        }}
        className={`w-full h-full object-cover pointer-events-none transition-all duration-200 ${
          img.visible ? '' : 'grayscale opacity-50'
        }`}
      />

      {!compact && (
        <span
          className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
            img.visible
              ? 'bg-orange border-orange text-white'
              : 'bg-black/35 border-white/70 text-transparent group-hover/tile:text-white/80'
          }`}
          aria-hidden
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
      )}

      {isCover && (
        <span className={`absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-orange text-white font-semibold ${compact ? 'px-1 text-[9px]' : 'px-1.5 py-0.5 text-[10px]'}`}>
          <Star className="w-3 h-3" strokeWidth={2} fill="currentColor" />
          {!compact && 'Portada'}
        </span>
      )}

      <span className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 text-white font-medium ${compact ? 'px-1 text-[9px]' : 'px-1.5 py-0.5 text-[10px]'}`}>
        {img.visible ? `#${position}` : (
          <>
            <EyeOff className="w-3 h-3" strokeWidth={2} />
            {!compact && 'Oculta'}
          </>
        )}
      </span>

      {!compact && (
        <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/tile:opacity-100 focus-within:opacity-100 transition-opacity">
          {!readOnly && onMakeCover && !isCover && img.visible && (
            <button
              type="button"
              title="Hacer portada"
              onClick={(e) => { e.stopPropagation(); onMakeCover() }}
              className="p-1 rounded bg-black/45 text-white hover:bg-orange transition-colors cursor-pointer"
            >
              <Star className="w-3 h-3" strokeWidth={2} />
            </button>
          )}
          <a
            href={img.url}
            target="_blank"
            rel="noreferrer"
            title="Ver en grande"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded bg-black/45 text-white hover:bg-black/70 transition-colors"
          >
            <Maximize2 className="w-3 h-3" strokeWidth={2} />
          </a>
        </span>
      )}
    </div>
  )
}
