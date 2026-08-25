'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import { refreshPropertyPhotos, usePhotoSync } from '@/hooks/usePhotoSync'

type Status = 'idle' | 'checking' | 'unchanged' | 'error'

interface PhotoRefreshButtonProps {
  propertyId: string
  /** Sin link de Drive no hay nada que revisar: el botón no se renderiza. */
  hasLink: boolean
  /** true = con texto "Actualizar fotos" siempre; false = solo icono (tarjeta). */
  label?: boolean
}

/**
 * Botón "Actualizar fotos": revisa la carpeta de Drive de la propiedad en el
 * momento (sin esperar la revisión automática de 24 h). Si hay fotos nuevas o
 * borradas dispara la importación normal; si no, avisa "Sin fotos nuevas".
 */
export function PhotoRefreshButton({ propertyId, hasLink, label = false }: PhotoRefreshButtonProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncing = usePhotoSync().syncingIds.has(propertyId)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  if (!hasLink) return null

  const flash = (s: Status, msg = '') => {
    setStatus(s)
    setMessage(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 4000)
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (status === 'checking' || syncing) return
    setStatus('checking')
    const outcome = await refreshPropertyPhotos(propertyId)
    if (outcome.result === 'importing') {
      // La portada muestra "Importando fotos…" y al terminar se refresca sola
      setStatus('idle')
    } else if (outcome.result === 'unchanged') {
      flash('unchanged')
    } else if (outcome.result === 'no_link') {
      flash('error', 'La propiedad no tiene link de Drive')
    } else {
      flash('error', outcome.message)
    }
  }

  const busy = status === 'checking' || syncing
  const title =
    status === 'unchanged'
      ? 'Sin fotos nuevas en Drive'
      : status === 'error'
        ? message
        : syncing
          ? 'Importando fotos…'
          : 'Actualizar fotos desde Drive'

  const colorClass =
    status === 'error'
      ? 'text-red-500 bg-red-500/10'
      : status === 'unchanged'
        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
        : 'text-text-secondary hover:text-orange hover:bg-orange/10'

  const text =
    status === 'unchanged'
      ? 'Sin fotos nuevas'
      : status === 'error'
        ? 'Error'
        : label
          ? 'Actualizar fotos'
          : null

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={`flex items-center gap-1 p-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer disabled:cursor-default ${colorClass}`}
      title={title}
      aria-label="Actualizar fotos desde Drive"
    >
      {status === 'unchanged' ? (
        <Check className="w-4 h-4" strokeWidth={1.5} />
      ) : status === 'error' ? (
        <X className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} strokeWidth={1.5} />
      )}
      {text && <span className="text-[11px] font-medium">{text}</span>}
    </button>
  )
}
