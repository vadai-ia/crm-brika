'use client'

import { ImageOff, Images, ChevronUp, EyeOff, Loader2 } from 'lucide-react'
import type { PropertyCover } from '@/types/inventario'

interface PropertyCardCoverProps {
  /** `undefined` = cargando, `null` = sin fotos. */
  cover: PropertyCover | null | undefined
  alt: string
  open: boolean
  /** Fotos ocultas en la página web. */
  hiddenCount: number
  /** Sus fotos se están importando desde Drive en este momento. */
  syncing?: boolean
  onToggle: () => void
}

const FRAME = 'relative block w-full aspect-[16/10] overflow-hidden bg-bg-tertiary'

/** Primera foto visible en la web; al hacer click despliega la galería dentro de la tarjeta. */
export function PropertyCardCover({ cover, alt, open, hiddenCount, syncing = false, onToggle }: PropertyCardCoverProps) {
  if (cover === undefined) {
    return <div className={`${FRAME} animate-pulse`} aria-hidden />
  }

  if (cover === null && syncing) {
    return (
      <div className={`${FRAME} flex flex-col items-center justify-center gap-1.5 text-text-tertiary`}>
        <Loader2 className="w-5 h-5 animate-spin text-orange" strokeWidth={1.5} />
        <span className="text-[11px]">Importando fotos…</span>
      </div>
    )
  }

  if (cover === null) {
    return (
      <div className={`${FRAME} flex flex-col items-center justify-center gap-1.5 text-text-tertiary`}>
        <ImageOff className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-[11px]">Sin fotos</span>
      </div>
    )
  }

  const photosLabel = `${cover.count} foto${cover.count !== 1 ? 's' : ''}`
  const allHidden = hiddenCount >= cover.count

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? 'Ocultar fotos' : `Ver ${photosLabel}`}
      className={`${FRAME} cursor-pointer group/cover focus:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-inset`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover.url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          // Sin miniatura generada (foto subida a mano): usar la versión web
          if (e.currentTarget.src !== cover.fullUrl) e.currentTarget.src = cover.fullUrl
        }}
        className={`w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-[1.03] ${
          allHidden ? 'grayscale opacity-60' : ''
        }`}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}
      />
      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium">
        {open ? (
          <ChevronUp className="w-3 h-3" strokeWidth={2} />
        ) : (
          <Images className="w-3 h-3" strokeWidth={1.5} />
        )}
        {open ? 'Ocultar fotos' : photosLabel}
      </span>
      {hiddenCount > 0 && (
        <span
          className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning text-white text-[11px] font-semibold shadow-md"
          title="Fotos ocultas en la página web"
        >
          <EyeOff className="w-3 h-3" strokeWidth={2} />
          {hiddenCount} oculta{hiddenCount !== 1 ? 's' : ''}
        </span>
      )}
    </button>
  )
}
