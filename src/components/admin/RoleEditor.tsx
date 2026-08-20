'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Role } from '@/types/roles'
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '@/types/roles'

const PERM_LABELS: Record<string, string> = {
  'propiedades.view': 'Ver', 'propiedades.create': 'Crear', 'propiedades.edit': 'Editar', 'propiedades.delete': 'Eliminar',
  'pdf.view': 'Generar PDFs',
  'calendario.view': 'Ver',
  'whaapy.view': 'Ver',
  'anuncios.view': 'Ver', 'anuncios.create': 'Enviar anuncios',
  'asesores.view': 'Ver', 'asesores.create': 'Crear', 'asesores.edit': 'Editar', 'asesores.delete': 'Eliminar',
  'desarrollos.view': 'Ver', 'desarrollos.create': 'Crear', 'desarrollos.edit': 'Editar', 'desarrollos.delete': 'Eliminar',
  'columnas.view': 'Ver', 'columnas.edit': 'Editar',
  'webhooks.view': 'Ver', 'webhooks.manage': 'Gestionar',
  'apikeys.view': 'Ver', 'apikeys.manage': 'Gestionar',
  'carta_propuesta.view': 'Generar cartas',
  'carga_masiva.view': 'Usar carga masiva',
  'formularios.view': 'Ver leads',
}

interface RoleEditorProps {
  role?: Role | null
  onClose: () => void
  onSaved: () => void
  onToast: (msg: string, type: 'success' | 'error') => void
}

export function RoleEditor({ role, onClose, onSaved, onToast }: RoleEditorProps) {
  const isEdit = !!role
  const isSystem = role?.is_system ?? false
  const isAdmin = role?.name === 'admin'

  const [name, setName] = useState(role?.name ?? '')
  const [displayName, setDisplayName] = useState(role?.display_name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    if (role) return { ...role.permissions }
    const p: Record<string, boolean> = {}
    for (const k of Object.keys(ALL_PERMISSIONS)) p[k] = false
    return p
  })
  const [submitting, setSubmitting] = useState(false)

  const togglePerm = (key: string) => {
    if (isAdmin) return
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { onToast('Nombre es requerido', 'error'); return }
    if (!isEdit && !name.trim()) { onToast('Slug es requerido', 'error'); return }

    setSubmitting(true)
    const url = isEdit ? `/api/roles/${role!.id}` : '/api/roles'
    const method = isEdit ? 'PUT' : 'POST'
    const body = isEdit
      ? { display_name: displayName.trim(), description: description.trim() || null, permissions }
      : { name: name.trim().toLowerCase().replace(/\s+/g, '_'), display_name: displayName.trim(), description: description.trim() || null, permissions }

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        onToast(data.error || 'Error al guardar', 'error')
        return
      }
      onToast(isEdit ? 'Rol actualizado' : 'Rol creado', 'success')
      onSaved()
      onClose()
    } catch {
      onToast('Error de conexion', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto flex items-start justify-center">
        <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-xl shadow-2xl my-8 mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
            <h2 className="text-base font-semibold text-text-primary">{isEdit ? `Editar: ${role!.display_name}` : 'Nuevo Rol'}</h2>
            <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary"><X className="w-5 h-5" strokeWidth={1.5} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Slug (identificador unico) *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: gerencia_ventas"
                  className="w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary font-mono focus:outline-none focus:border-orange" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ej: Gerencia de Ventas"
                className="w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary focus:outline-none focus:border-orange" />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Descripcion</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary focus:outline-none focus:border-orange" />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-3">Permisos</label>
              {isAdmin && <p className="text-xs text-text-tertiary mb-3">El rol admin tiene todos los permisos habilitados permanentemente.</p>}

              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <h4 className="text-xs font-semibold text-text-primary mb-2">{group.label}</h4>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                      {group.keys.map((key) => {
                        const label = PERM_LABELS[key] ?? key
                        const active = isAdmin ? true : permissions[key] === true
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-1.5 cursor-pointer text-xs ${isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={() => togglePerm(key)}
                              disabled={isAdmin}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                ${active ? 'bg-orange border-orange' : 'border-border-primary bg-bg-primary'}`}
                            >
                              {active && <span className="text-white text-[10px] font-bold">✓</span>}
                            </button>
                            <span className={active ? 'text-text-primary' : 'text-text-tertiary'}>{label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
              <button type="button" onClick={onClose} className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" disabled={submitting || isAdmin} className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer">
                {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Rol'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
