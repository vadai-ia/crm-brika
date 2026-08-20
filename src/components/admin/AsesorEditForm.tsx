'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Profile, ProfileWithAuth, ThemePreference } from '@/types'
import type { Role } from '@/types/roles'
import type { ToastType } from '@/components/ui/Toast'
import type { UpdateAsesorInput } from '@/lib/validations/asesor'
import { ROLE_ADMIN, THEME_LABELS, THEME_OPTIONS } from '@/lib/utils/constants'

interface AsesorEditFormProps {
  asesor: ProfileWithAuth
  roles: Role[]
  isAdmin: boolean
  isSelf: boolean
  onCancel: () => void
  onSaved: (profile: Profile) => void
  onToast: (message: string, type: ToastType) => void
}

interface FormState {
  full_name: string
  email: string
  role: string
  avatar_url: string
  theme_preference: ThemePreference
}

export function AsesorEditForm({ asesor, roles, isAdmin, isSelf, onCancel, onSaved, onToast }: AsesorEditFormProps) {
  const [form, setForm] = useState<FormState>({
    full_name: asesor.full_name,
    email: asesor.email,
    role: asesor.role,
    avatar_url: asesor.avatar_url ?? '',
    theme_preference: asesor.theme_preference ?? 'system',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  // Un no-admin no puede otorgar admin; si el rol actual no está en la lista se muestra bloqueado
  const roleOptions = roles.filter((r) => isAdmin || r.name !== ROLE_ADMIN)
  const roleInList = roleOptions.some((r) => r.name === form.role)

  const buildPatch = (): UpdateAsesorInput => {
    const patch: UpdateAsesorInput = {}
    const name = form.full_name.trim()
    const email = form.email.trim()
    const avatar = form.avatar_url.trim() || null
    if (name !== asesor.full_name) patch.full_name = name
    if (email !== asesor.email) patch.email = email
    if (form.role !== asesor.role) patch.role = form.role
    if (avatar !== asesor.avatar_url) patch.avatar_url = avatar
    if (form.theme_preference !== (asesor.theme_preference ?? 'system')) patch.theme_preference = form.theme_preference
    return patch
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const patch = buildPatch()
    if (Object.keys(patch).length === 0) {
      onToast('No hay cambios que guardar', 'warning')
      return
    }
    setSaving(true)
    setErrors({})
    try {
      const res = await fetch(`/api/asesores/${asesor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (Array.isArray(body.details)) {
          const fieldErrors: Record<string, string> = {}
          for (const d of body.details) {
            const path = d.path?.[0]
            if (typeof path === 'string') fieldErrors[path] = d.message
          }
          setErrors(fieldErrors)
          onToast('Revisa los campos con errores', 'error')
        } else {
          onToast(body.error || 'Error al guardar', 'error')
        }
        return
      }
      onToast('Usuario actualizado', 'success')
      onSaved(body.data as Profile)
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = (key: string) =>
    `w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border bg-bg-primary text-text-primary
    placeholder:text-text-tertiary transition-colors focus:outline-none focus:ring-1
    ${errors[key] ? 'border-red-500 focus:ring-red-500' : 'border-border-primary focus:border-orange focus:ring-orange/30'}`

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Editar perfil</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Nombre completo *</label>
          <input className={inputClass('full_name')} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Email *</label>
          <input className={inputClass('email')} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
          {form.email.trim() !== asesor.email && (
            <p className="text-[11px] text-text-tertiary mt-0.5">Cambia también el email con el que inicia sesión.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Rol</label>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            disabled={isSelf}
            className={`${inputClass('role')} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {!roleInList && <option value={form.role} disabled>{form.role} (sin acceso para asignar)</option>}
            {roleOptions.map((r) => <option key={r.name} value={r.name}>{r.display_name}</option>)}
          </select>
          {errors.role && <p className="text-xs text-red-500 mt-0.5">{errors.role}</p>}
          {isSelf && <p className="text-[11px] text-text-tertiary mt-0.5">No puedes cambiar tu propio rol.</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Tema de la interfaz</label>
          <select
            value={form.theme_preference}
            onChange={(e) => set('theme_preference', e.target.value as ThemePreference)}
            className={`${inputClass('theme_preference')} cursor-pointer`}
          >
            {THEME_OPTIONS.map((t) => <option key={t} value={t}>{THEME_LABELS[t]}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1">Avatar (URL de imagen)</label>
          <input
            className={inputClass('avatar_url')}
            value={form.avatar_url}
            onChange={(e) => set('avatar_url', e.target.value)}
            placeholder="https://…/foto.jpg (opcional)"
          />
          {errors.avatar_url && <p className="text-xs text-red-500 mt-0.5">{errors.avatar_url}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />}
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
