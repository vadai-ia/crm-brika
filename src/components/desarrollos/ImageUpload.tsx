'use client'

import { useRef, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  label: string
  currentUrl: string | null
  onUpload: (url: string) => void
  onRemove: () => void
  onError: (msg: string) => void
}

export function ImageUpload({ label, currentUrl, onUpload, onRemove, onError }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      onError('La imagen supera el tamaño permitido. Verifica que sea en formato JPEG para reducir el peso del archivo.')
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        onError(body.error || 'Error al subir imagen')
        return
      }
      const data = await res.json()
      onUpload(data.url)
    } catch {
      onError('Error de conexión al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const validUrl = currentUrl && currentUrl.trim().length > 1

  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      {validUrl ? (
        <div className="flex items-center gap-3">
          <img
            src={currentUrl!}
            alt={label}
            className="w-[120px] h-[80px] object-cover rounded-[var(--radius-sm)] border border-border-primary"
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-orange hover:text-orange-hover cursor-pointer transition-colors"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-red-500 hover:text-red-600 cursor-pointer transition-colors"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 h-9 px-3 text-xs font-medium rounded-[var(--radius-sm)]
            border border-dashed border-border-primary text-text-secondary hover:text-text-primary
            hover:border-orange/50 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
          {uploading ? 'Subiendo...' : 'Subir imagen'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
