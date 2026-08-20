'use client'

import { Download, Pencil } from 'lucide-react'

interface CartaPreviewProps {
  pdfUrl: string
  onEdit: () => void
  onDownloadPdf: () => void
  onDownloadWord: () => void
}

export function CartaPreview({ pdfUrl, onEdit, onDownloadPdf, onDownloadWord }: CartaPreviewProps) {
  return (
    <div className="brika-card p-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Vista previa</h2>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Pencil className="w-4 h-4" strokeWidth={1.5} />
            Editar
          </button>
          <button onClick={onDownloadWord} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Descargar Word
          </button>
          <button onClick={onDownloadPdf} className="brika-btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Descargar PDF
          </button>
        </div>
      </div>
      <iframe
        src={pdfUrl}
        title="Vista previa de la carta propuesta"
        className="w-full border border-border-primary rounded-[var(--radius-sm)]"
        style={{ height: '80vh', background: '#FFFFFF' }}
      />
    </div>
  )
}
