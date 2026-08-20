'use client'

import { useCallback, useState } from 'react'
import { Plus, Users, Shield } from 'lucide-react'
import { AsesorList } from '@/components/admin/AsesorList'
import { AsesorCreateModal } from '@/components/admin/AsesorCreateModal'
import { RolesTab } from '@/components/admin/RolesTab'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { usePermissions } from '@/hooks/usePermissions'

type Tab = 'usuarios' | 'roles'

export default function AsesoresPage() {
  const { permissions, can } = usePermissions()
  const isAdmin = permissions._isAdmin === true
  const canCreate = can('asesores.create')

  const [tab, setTab] = useState<Tab>('usuarios')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" strokeWidth={1.5} /> },
    ...(isAdmin ? [{ key: 'roles' as Tab, label: 'Roles y permisos', icon: <Shield className="w-4 h-4" strokeWidth={1.5} /> }] : []),
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="brika-page-title">Asesores</h1>
          <p className="brika-page-desc mt-1">
            Todos los perfiles registrados en la plataforma (tabla <code className="font-mono text-xs">profiles</code>): datos, rol, estado y acceso.
          </p>
        </div>
        {tab === 'usuarios' && canCreate && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
              bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Nuevo usuario
          </button>
        )}
      </div>

      {tabs.length > 1 && (
        <div className="inline-flex p-1 rounded-[var(--radius-sm)] bg-bg-tertiary border border-border-primary">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 h-8 px-3 text-sm font-medium rounded-[6px] transition-colors cursor-pointer ${
                tab === t.key
                  ? 'bg-bg-primary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'usuarios' ? (
        <AsesorList
          onCreateClick={() => setModalOpen(true)}
          refreshKey={refreshKey}
          perms={{ isAdmin, canEdit: can('asesores.edit'), canDelete: can('asesores.delete') }}
          canCreate={canCreate}
        />
      ) : (
        <RolesTab onToast={showToast} />
      )}

      {modalOpen && (
        <AsesorCreateModal
          isAdmin={isAdmin}
          onClose={() => setModalOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          onToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
