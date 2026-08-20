'use client'

import { useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import type { ToastType } from '@/components/ui/Toast'
import { RoleManager } from './RoleManager'
import { RoleEditor } from './RoleEditor'

interface RolesTabProps {
  onToast: (message: string, type: ToastType) => void
}

/** Pestaña "Roles y permisos" dentro de Asesores: reutiliza el gestor de roles (solo admin). */
export function RolesTab({ onToast }: RolesTabProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="brika-card p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div className="text-sm">
          <p className="font-medium text-text-primary">Cómo funcionan los permisos</p>
          <ul className="mt-1 space-y-1 text-text-secondary text-[13px] list-disc pl-4">
            <li>Los permisos se asignan <strong>por rol</strong>, no por usuario: cambiar un rol afecta a todos los usuarios que lo tienen.</li>
            <li>El rol <code className="font-mono text-xs">admin</code> siempre tiene acceso total (ignora esta matriz) y es el único que puede gestionar roles y crear otros admins.</li>
            <li>Los demás roles solo ven en el menú y pueden usar lo que tengan marcado aquí; la API rechaza con 403 lo que no esté permitido.</li>
            <li>Los cambios aplican en la siguiente carga de página del usuario afectado.</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Nuevo rol
        </button>
      </div>

      <RoleManager onCreateClick={() => setFormOpen(true)} refreshKey={refreshKey} />

      {formOpen && (
        <RoleEditor
          onClose={() => setFormOpen(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
          onToast={onToast}
        />
      )}
    </div>
  )
}
