'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Loader2, Pencil, Trash2 } from 'lucide-react'
import type { Role } from '@/types/roles'
import type { ToastType } from '@/components/ui/Toast'
import { Toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { RoleEditor } from './RoleEditor'

interface RoleManagerProps {
  onCreateClick: () => void
  refreshKey: number
}

export function RoleManager({ onCreateClick, refreshKey }: RoleManagerProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/roles')
      if (res.ok) { const json = await res.json(); setRoles(json.data ?? []) }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles, refreshKey])

  const showToast = useCallback((msg: string, type: ToastType) => setToast({ message: msg, type }), [])

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/roles/${deleting.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        showToast('Rol eliminado', 'success')
        setDeleting(null)
        fetchRoles()
      } else {
        const body = await res.json().catch(() => ({}))
        showToast(body.error || 'Error al eliminar', 'error')
      }
    } catch { showToast('Error de conexion', 'error') }
    finally { setDeleteLoading(false) }
  }

  const permCount = (perms: Record<string, boolean>) => Object.values(perms).filter(Boolean).length

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-text-tertiary animate-spin" strokeWidth={1.5} /></div>
  }

  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Shield className="w-12 h-12 text-text-tertiary mb-4" strokeWidth={1.5} />
        <h2 className="text-base font-semibold text-text-primary mb-1">No hay roles</h2>
        <button onClick={onCreateClick} className="mt-4 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer">Crear Rol</button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {roles.map((role) => (
          <div key={role.id} className="flex items-center gap-4 px-4 py-3 rounded-[var(--radius-sm)] border border-border-primary bg-bg-secondary">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-text-primary">{role.display_name}</span>
                {role.is_system && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">Sistema</span>
                )}
                <span className="text-[10px] text-text-tertiary">{permCount(role.permissions)} permisos</span>
              </div>
              {role.description && <p className="text-xs text-text-tertiary truncate">{role.description}</p>}
              <code className="text-[10px] font-mono text-text-tertiary">{role.name}</code>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setEditing(role)} className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer" title="Editar">
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              {!role.is_system && (
                <button onClick={() => setDeleting(role)} className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer" title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && <RoleEditor role={editing} onClose={() => setEditing(null)} onSaved={fetchRoles} onToast={showToast} />}

      {deleting && (
        <ConfirmDialog title="Eliminar Rol" message={`Eliminar "${deleting.display_name}"? Los usuarios con este rol perderan sus permisos.`}
          confirmLabel="Eliminar" variant="danger" loading={deleteLoading} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
