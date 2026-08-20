'use client'

import { useEffect, useState } from 'react'
import { X, Eye, EyeOff, Wand2, Copy, Check, CheckCircle2 } from 'lucide-react'
import type { ToastType } from '@/components/ui/Toast'
import { ROLE_ADMIN, ROLE_ASESOR } from '@/lib/utils/constants'

interface AsesorCreateModalProps {
  isAdmin: boolean
  onClose: () => void
  onSuccess: () => void
  onToast: (message: string, type: ToastType) => void
}

interface RoleOption { name: string; display_name: string }

// Sin caracteres ambiguos (0/O, 1/l/I) para que se pueda dictar por teléfono
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'

function generatePassword(length = 12): string {
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join('')
}

export function AsesorCreateModal({ isAdmin, onClose, onSuccess, onToast }: AsesorCreateModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>(ROLE_ASESOR)
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/roles')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        const list: RoleOption[] = (json.data ?? []).filter((r: RoleOption) => isAdmin || r.name !== ROLE_ADMIN)
        setRoles(list)
      })
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const clearError = (key: string) => {
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleGenerate = () => {
    setPassword(generatePassword())
    setShowPassword(true)
    clearError('password')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    try {
      const res = await fetch('/api/asesores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), password, role }),
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
          onToast(body.error || 'Error al crear usuario', 'error')
        }
        return
      }
      onToast(`Usuario creado: ${email.trim()}`, 'success')
      setCreated({ email: email.trim(), password })
      onSuccess()
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const copyCredentials = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(`Email: ${created.email}\nContraseña: ${created.password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard no disponible
    }
  }

  const inputClass = (key: string) =>
    `w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border bg-bg-primary text-text-primary
    placeholder:text-text-tertiary transition-colors focus:outline-none focus:ring-1
    ${errors[key] ? 'border-red-500 focus:ring-red-500' : 'border-border-primary focus:border-orange focus:ring-orange/30'}`

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-md shadow-2xl my-8 mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 className="text-base font-semibold text-text-primary">{created ? 'Usuario creado' : 'Nuevo usuario'}</h2>
          <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {created ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm text-text-primary">
                La cuenta ya puede iniciar sesión. Comparte estas credenciales ahora: la contraseña no se vuelve a mostrar.
              </p>
            </div>
            <dl className="space-y-2 p-3 rounded-[var(--radius-sm)] border border-border-primary bg-bg-secondary">
              <div>
                <dt className="text-xs text-text-tertiary">Email</dt>
                <dd className="text-sm font-medium text-text-primary break-all">{created.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-tertiary">Contraseña</dt>
                <dd className="text-sm font-mono font-medium text-text-primary select-all">{created.password}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
              <button onClick={copyCredentials} className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] border border-border-primary text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer flex items-center gap-2">
                {copied ? <Check className="w-4 h-4 text-emerald-500" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                {copied ? 'Copiado' : 'Copiar credenciales'}
              </button>
              <button onClick={onClose} className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer">
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Nombre completo *</label>
              <input className={inputClass('full_name')} value={fullName} onChange={(e) => { setFullName(e.target.value); clearError('full_name') }} placeholder="Juan Pérez" autoFocus />
              {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email *</label>
              <input className={inputClass('email')} type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email') }} placeholder="usuario@brika.com.mx" />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-text-secondary">Contraseña * (mín. 8 caracteres)</label>
                <button type="button" onClick={handleGenerate} className="flex items-center gap-1 text-xs font-medium text-orange hover:underline cursor-pointer">
                  <Wand2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Generar
                </button>
              </div>
              <div className="relative">
                <input
                  className={`${inputClass('password')} pr-9 ${showPassword ? 'font-mono' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError('password') }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-primary cursor-pointer transition-colors" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={`${inputClass('role')} cursor-pointer`}>
                {roles.map((r) => <option key={r.name} value={r.name}>{r.display_name}</option>)}
                {roles.length === 0 && <option value={ROLE_ASESOR}>Asesor</option>}
              </select>
              {errors.role && <p className="text-xs text-red-500 mt-0.5">{errors.role}</p>}
              {role === ROLE_ADMIN && (
                <p className="text-[11px] text-orange mt-1">Un admin tiene acceso total a la plataforma, incluida la gestión de usuarios y roles.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
              <button type="button" onClick={onClose} className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer">
                {submitting ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
