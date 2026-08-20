'use client'

import { useCallback, useEffect, useState } from 'react'
import { FilePlus2 } from 'lucide-react'
import type { CartaFormState, CartaProperty } from '@/types/carta-propuesta'
import { createClient } from '@/lib/supabase/client'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CartaForm } from '@/components/carta-propuesta/CartaForm'
import { CartaPreview } from '@/components/carta-propuesta/CartaPreview'
import { generateCartaPdf } from '@/components/carta-propuesta/generateCartaPdf'
import { generateCartaDocx } from '@/components/carta-propuesta/generateCartaDocx'
import {
  buildCartaData, canGenerateCarta, cartaFileName, hasAnyData, makeEmptyForm, prefillFromProperty,
} from '@/components/carta-propuesta/cartaFormState'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function CartaPropuestaPage() {
  const [asesorName, setAsesorName] = useState('')
  const [form, setForm] = useState<CartaFormState>(makeEmptyForm(''))
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)

  // Nombre del asesor desde su perfil (solo si aún no escribió otro)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          const name = (data?.full_name as string) ?? ''
          setAsesorName(name)
          setForm((prev) => (prev.nombreAsesor === '' ? { ...prev, nombreAsesor: name } : prev))
        })
    })
  }, [])

  const showToast = useCallback((message: string, type: ToastType) => setToast({ message, type }), [])

  const update = <K extends keyof CartaFormState>(key: K, value: CartaFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSelectProperty = (p: CartaProperty) => setForm((prev) => prefillFromProperty(prev, p))

  const canGenerate = canGenerateCarta(form)

  const clearPreview = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    setPdfBlob(null)
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    setGenerating(true)
    try {
      const blob = await generateCartaPdf(buildCartaData(form))
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfBlob(blob)
      setPdfUrl(URL.createObjectURL(blob))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al generar PDF', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadPdf = () => {
    if (pdfBlob) downloadBlob(pdfBlob, cartaFileName(form.nombreCliente, 'pdf'))
  }

  const handleDownloadWord = async () => {
    try {
      const blob = await generateCartaDocx(buildCartaData(form))
      downloadBlob(blob, cartaFileName(form.nombreCliente, 'docx'))
    } catch {
      showToast('Error al generar Word', 'error')
    }
  }

  const doReset = () => {
    clearPreview()
    setForm(makeEmptyForm(asesorName))
  }

  const handleNewCarta = () => {
    if (hasAnyData(form, asesorName) || pdfUrl) setConfirmNew(true)
    else doReset()
  }

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brika-page-title">Carta Propuesta</h1>
          <p className="brika-page-desc mt-1">Genera una propuesta de compra para tu cliente. Lo que dejes vacío no aparece en la carta.</p>
        </div>
        <button onClick={handleNewCarta} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          <FilePlus2 className="w-4 h-4" strokeWidth={1.5} />
          Nueva carta
        </button>
      </div>

      {/* El formulario queda montado (oculto) para que el selector conserve su lista al alternar con la vista previa */}
      <div className={pdfUrl ? 'hidden' : ''}>
        <CartaForm
          form={form}
          onChange={update}
          onSelectProperty={handleSelectProperty}
          focusedKey={focusedKey}
          setFocusedKey={setFocusedKey}
          canGenerate={canGenerate}
          generating={generating}
          onGenerate={handleGenerate}
        />
      </div>

      {pdfUrl && (
        <CartaPreview
          pdfUrl={pdfUrl}
          onEdit={clearPreview}
          onDownloadPdf={handleDownloadPdf}
          onDownloadWord={handleDownloadWord}
        />
      )}

      {confirmNew && (
        <ConfirmDialog
          title="Nueva carta"
          message="¿Empezar una carta nueva? Se perderán los datos actuales."
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
