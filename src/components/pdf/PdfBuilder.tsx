'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Loader2, AlertTriangle, FilePlus2 } from 'lucide-react'
import { usePdfSelection } from '@/hooks/usePdfSelection'
import { usePdfDeepLink } from '@/hooks/usePdfDeepLink'
import type { Property } from '@/types'
import { PdfPreview } from './PdfPreview'
import { PdfPropertySelector } from './PdfPropertySelector'
import { generateFichaPdf } from './ficha'
import { downloadBlob } from '@/lib/utils/download'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function PdfBuilder() {
  const { selectedProperties, count, addProperty, removeProperty, clearSelection } = usePdfSelection()
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [coverMap, setCoverMap] = useState<Record<number, string>>({})
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)

  const selectedIds = useMemo(
    () => new Set(selectedProperties.map((p) => p.id)),
    [selectedProperties]
  )

  // Fetch cover images (Supabase Storage) for selected properties, keyed by id
  useEffect(() => {
    const ids = selectedProperties.map((p) => String(p.id))
    if (ids.length === 0) { setImageMap({}); return }

    fetch('/api/pdf/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((data) => setImageMap(data.images ?? {}))
      .catch(() => {})
  }, [selectedProperties])

  const doReset = useCallback(() => {
    clearSelection()
    setCoverMap({})
  }, [clearSelection])

  const handleGenerate = useCallback(async () => {
    if (count === 0) return
    setGenerating(true)
    try {
      const { blob, filename } = await generateFichaPdf(selectedProperties, imageMap, coverMap)
      downloadBlob(blob, filename)
      setToast({ message: 'Ficha descargada', type: 'success' })
      // La selección se limpia DESPUÉS de generar y descargar (pedido del
      // usuario); si la generación falla, se conserva para reintentar.
      doReset()
    } catch (err) {
      console.error('PDF generation error:', err)
      setToast({ message: 'Error al generar la ficha', type: 'error' })
    } finally {
      setGenerating(false)
    }
  }, [count, selectedProperties, imageMap, coverMap, doReset])

  const handlePickCover = useCallback((id: number, dataUrl: string) => {
    setCoverMap((prev) => ({ ...prev, [id]: dataUrl }))
  }, [])

  const handleRemove = useCallback((id: number) => {
    removeProperty(id)
    setCoverMap((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [removeProperty])

  const handleNewPdf = useCallback(() => {
    if (count > 0) {
      setConfirmNew(true)
    } else {
      doReset()
    }
  }, [count, doReset])

  // "Crear PDF" desde Propiedades (/dashboard/pdf?id=…): la ficha queda solo con esa(s) propiedad(es)
  const applyDeepLink = useCallback((list: Property[]) => {
    clearSelection()
    list.forEach(addProperty)
    setCoverMap({})
    setToast({
      message: list.length === 1 ? 'Propiedad cargada en la ficha' : `${list.length} propiedades cargadas en la ficha`,
      type: 'success',
    })
  }, [clearSelection, addProperty])
  const deepLinkError = useCallback((message: string) => setToast({ message, type: 'error' }), [])
  usePdfDeepLink(applyDeepLink, deepLinkError)

  return (
    <div className="space-y-6">
      {/* Top bar with reset button */}
      <div className="flex items-center justify-end">
        <button
          onClick={handleNewPdf}
          className="brika-btn-secondary"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          <FilePlus2 className="w-4 h-4" strokeWidth={1.5} />
          Nueva Ficha
        </button>
      </div>

      {/* Preview */}
      <PdfPreview
        properties={selectedProperties}
        imageMap={imageMap}
        coverMap={coverMap}
        onRemove={handleRemove}
        onPickCover={handlePickCover}
      />

      {count > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={clearSelection}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
          >
            Limpiar selección
          </button>
        </div>
      )}

      {count >= 50 && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={1.5} />
          <p className="text-xs text-amber-600 dark:text-amber-400">El PDF puede tardar en generarse con muchas propiedades.</p>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={count === 0 || generating}
        className="flex items-center justify-center gap-2 w-full h-11 text-sm font-medium rounded-[var(--radius-sm)]
          bg-orange text-white hover:bg-orange-hover disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors cursor-pointer"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Generando ficha...</>
        ) : (
          <><Download className="w-4 h-4" strokeWidth={1.5} /> Generar y Descargar Ficha ({count})</>
        )}
      </button>

      {/* Separator */}
      <div className="border-t border-border-primary pt-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Agregar propiedades</h3>
        <PdfPropertySelector selectedIds={selectedIds} onAdd={addProperty} onRemove={handleRemove} />
      </div>

      {confirmNew && (
        <ConfirmDialog
          title="Nueva Ficha"
          message="¿Empezar una ficha nueva? Se perderán las selecciones actuales."
          confirmLabel="Empezar de nuevo"
          variant="danger"
          onConfirm={() => { doReset(); setConfirmNew(false) }}
          onCancel={() => setConfirmNew(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
