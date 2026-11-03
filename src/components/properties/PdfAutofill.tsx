'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import { PDF_EXTRACT_MAX_BYTES } from '@/lib/utils/constants'

interface PdfAutofillProps {
  onExtracted: (fields: Record<string, string | number>) => void
  onToast: (message: string, type: 'success' | 'error') => void
}

// "Subir PDF" en el alta de propiedades: la IA lee la ficha y prellena el
// formulario (lib/services/pdf-extract-service). Todo queda editable.
export function PdfAutofill({ onExtracted, onToast }: PdfAutofillProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ name: string; count: number } | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') return onToast('El archivo debe ser un PDF', 'error')
    if (file.size > PDF_EXTRACT_MAX_BYTES) return onToast('El PDF no puede pesar más de 4 MB', 'error')

    setLoading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/properties/extract-pdf', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return onToast(data.error || 'No se pudo leer el PDF', 'error')

      const fields: Record<string, string | number> = data.fields ?? {}
      const count = Object.keys(fields).length
      if (count === 0) return onToast('No se encontraron datos de la propiedad en el PDF', 'error')
      onExtracted(fields)
      setResult({ name: file.name, count })
      onToast(`${count} campos prellenados desde el PDF — revísalos antes de guardar`, 'success')
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-dashed border-border-primary bg-bg-secondary">
      <FileText className="w-5 h-5 shrink-0 text-orange" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">
          {loading ? 'Leyendo PDF…' : result ? result.name : '¿Tienes la ficha en PDF?'}
        </p>
        <p className="text-xs text-text-tertiary truncate">
          {loading
            ? 'Puede tardar unos segundos'
            : result
              ? `${result.count} campos prellenados (borde naranja). Puedes editarlos.`
              : 'Súbela y rellenamos los campos por ti'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
          bg-orange text-white hover:bg-orange-hover disabled:opacity-60 transition-colors cursor-pointer shrink-0"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Upload className="w-4 h-4" strokeWidth={1.5} />}
        {result ? 'Subir otro' : 'Subir PDF'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  )
}
