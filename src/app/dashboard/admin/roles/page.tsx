'use client'

import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { RoleManager } from '@/components/admin/RoleManager'
import { RoleEditor } from '@/components/admin/RoleEditor'
import { Toast, type ToastType } from '@/components/ui/Toast'

export default function RolesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const showToast = useCallback((msg: string, type: ToastType) => setToast({ message: msg, type }), [])

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brika-page-title">Gestion de Roles</h1>
          <p className="brika-page-desc mt-1">Configura los permisos de cada rol en la plataforma</p>
        </div>
        <button onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer">
          <Plus className="w-4 h-4" strokeWidth={1.5} /> Nuevo Rol
        </button>
      </div>

      <RoleManager onCreateClick={() => setFormOpen(true)} refreshKey={refreshKey} />

      {formOpen && <RoleEditor onClose={() => setFormOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} onToast={showToast} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
