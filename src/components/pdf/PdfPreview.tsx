'use client'

import { useRef } from 'react'
import { X, ImagePlus } from 'lucide-react'
import type { Property } from '@/types'
import { formatPrice, displayValue } from '@/lib/utils/format'

interface PdfPreviewProps {
  properties: Property[]
  imageMap: Record<string, string>
  coverMap: Record<number, string>
  onRemove: (id: number) => void
  onPickCover: (id: number, dataUrl: string) => void
}

function CoverButton({ id, hasCover, onPick }: { id: number; hasCover: boolean; onPick: (id: number, dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') onPick(id, reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        title={hasCover ? 'Cambiar foto de portada' : 'Agregar foto de portada'}
        className={`p-1 transition-colors cursor-pointer flex-shrink-0 ${
          hasCover ? 'text-orange hover:text-orange-hover' : 'text-text-tertiary hover:text-text-secondary'
        }`}
      >
        <ImagePlus className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
      />
    </>
  )
}

export function PdfPreview({ properties, imageMap, coverMap, onRemove, onPickCover }: PdfPreviewProps) {
  if (properties.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-text-primary">
        {properties.length} propiedad{properties.length !== 1 ? 'es' : ''} seleccionada{properties.length !== 1 ? 's' : ''}
      </h3>
      <div className="space-y-2">
        {properties.map((p) => {
          const imgUrl = coverMap[p.id] ?? imageMap[p.id] ?? null
          return (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] border border-border-primary bg-bg-secondary">
              {imgUrl ? (
                <img src={imgUrl} alt="" className="w-12 h-8 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-8 rounded bg-bg-tertiary flex-shrink-0 flex items-center justify-center">
                  <ImagePlus className="w-3.5 h-3.5 text-text-tertiary" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {displayValue(p.nombre_kibah || p.nombre_desarrollador)}
                </p>
                <p className="text-xs text-text-tertiary">
                  {p.unidad ? `${p.unidad} · ` : ''}{displayValue(p.colonia)} · {formatPrice(p.precio_unidad)}
                </p>
              </div>
              <CoverButton id={p.id} hasCover={!!coverMap[p.id]} onPick={onPickCover} />
              <button
                onClick={() => onRemove(p.id)}
                className="p-1 text-text-tertiary hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-text-tertiary">
        La foto de portada se coloca en la parte superior de la ficha. Verifica que no tenga logos ni letreros identificables.
      </p>
    </div>
  )
}
