'use client'

import { useState } from 'react'
import { X, Copy, AlertTriangle } from 'lucide-react'

interface ApiKeyCreateModalProps {
  onClose: () => void
  onSuccess: () => void
  onToast: (message: string, type: 'success' | 'error') => void
}

const PERMISSION_OPTIONS = [
  { value: 'properties.read', label: 'Leer propiedades' },
  { value: 'properties.write', label: 'Escribir propiedades' },
]

export function ApiKeyCreateModal({ onClose, onSuccess, onToast }: ApiKeyCreateModalProps) {
  const [step, setStep] = useState<'form' | 'show'>('form')
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<string[]>(['properties.read'])
  const [noExpiry, setNoExpiry] = useState(true)
  const [expiresAt, setExpiresAt] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [plaintextKey, setPlaintextKey] = useState('')
  const [copied, setCopied] = useState(false)

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    const payload = {
      name: name.trim(),
      permissions,
      expires_at: noExpiry ? null : expiresAt || null,
    }

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.details && Array.isArray(body.details)) {
          const fieldErrors: Record<string, string> = {}
          for (const d of body.details) {
            const path = d.path?.[0]
            if (path) fieldErrors[path] = d.message
          }
          setErrors(fieldErrors)
          onToast('Revisa los campos con errores', 'error')
        } else {
          onToast(body.error || 'Error al crear', 'error')
        }
        return
      }

      const json = await res.json()
      setPlaintextKey(json.data.plaintext_key)
      setStep('show')
      onSuccess()
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plaintextKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
      const input = document.getElementById('api-key-display') as HTMLInputElement
      input?.select()
    }
  }

  const handleDone = () => {
    onClose()
  }

  // Block close on step 'show'
  const canClose = step === 'form'

  const inputClass = (key: string) =>
    `w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border bg-bg-primary text-text-primary
    placeholder:text-text-tertiary transition-colors
    ${errors[key] ? 'border-red-500' : 'border-border-primary focus:border-orange'}
    focus:outline-none focus:ring-1 ${errors[key] ? 'focus:ring-red-500' : 'focus:ring-orange/30'}`

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />
      <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-lg shadow-2xl my-8 mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 className="text-base font-semibold text-text-primary">
            {step === 'form' ? 'Nueva API Key' : 'API Key Creada'}
          </h2>
          {canClose && (
            <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary transition-colors">
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
              <input className={inputClass('name')} value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. N8N Integration" />
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Permisos</label>
              <div className="flex flex-wrap gap-2">
                {PERMISSION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => togglePermission(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer border
                      ${permissions.includes(opt.value)
                        ? 'bg-orange/15 text-orange border-orange/30'
                        : 'bg-bg-tertiary text-text-tertiary border-border-primary'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Expiración</label>
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setNoExpiry(!noExpiry)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0
                    ${noExpiry ? 'bg-orange' : 'bg-bg-tertiary border border-border-primary'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                    ${noExpiry ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs text-text-secondary">Sin expiración</span>
              </div>
              {!noExpiry && (
                <input
                  type="datetime-local"
                  className={inputClass('expires_at')}
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
              <button type="button" onClick={onClose} className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer">
                {submitting ? 'Creando...' : 'Crear API Key'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] bg-orange/10 border border-orange/20">
              <AlertTriangle className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-sm text-orange font-medium">
                Esta clave solo se muestra una vez. Cópiala ahora.
              </p>
            </div>

            {/* Key display */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Tu API Key</label>
              <div className="flex items-center gap-2">
                <input
                  id="api-key-display"
                  readOnly
                  value={plaintextKey}
                  className="flex-1 h-10 px-3 text-sm font-mono rounded-[var(--radius-sm)] border-2 border-orange bg-bg-primary text-text-primary select-all"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopy}
                  className="h-10 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" strokeWidth={1.5} />
                  {copied ? 'Copiada' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-primary">
              <button
                onClick={handleDone}
                className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
