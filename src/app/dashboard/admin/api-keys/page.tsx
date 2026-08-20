'use client'

import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { ApiKeyList } from '@/components/admin/ApiKeyList'
import { ApiKeyCreateModal } from '@/components/admin/ApiKeyCreateModal'
import { Toast, type ToastType } from '@/components/ui/Toast'

export default function ApiKeysPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brika-page-title">API Keys</h1>
          <p className="brika-page-desc mt-1">
            Crea API keys para que sistemas externos consulten las propiedades
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
            bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Nueva API Key
        </button>
      </div>

      <ApiKeyList
        onCreateClick={() => setModalOpen(true)}
        refreshKey={refreshKey}
      />

      {modalOpen && (
        <ApiKeyCreateModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          onToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
