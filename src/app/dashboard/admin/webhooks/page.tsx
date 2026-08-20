'use client'

import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { WebhookList } from '@/components/admin/WebhookList'
import { WebhookForm } from '@/components/admin/WebhookForm'
import { Toast, type ToastType } from '@/components/ui/Toast'

export default function WebhooksPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  const handleCreated = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brika-page-title">Webhooks</h1>
          <p className="brika-page-desc mt-1">
            Recibe notificaciones cuando se crean, editan o eliminan propiedades
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
            bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Nuevo Webhook
        </button>
      </div>

      <WebhookList key={refreshKey} onCreateClick={() => setFormOpen(true)} />

      {formOpen && (
        <WebhookForm
          onClose={() => setFormOpen(false)}
          onSuccess={handleCreated}
          onToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
