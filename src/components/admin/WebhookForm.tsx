'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Webhook } from '@/types'

interface WebhookFormProps {
  webhook?: Webhook | null
  onClose: () => void
  onSuccess: () => void
  onToast: (message: string, type: 'success' | 'error') => void
}

const EVENT_OPTIONS = [
  { value: 'property.created', label: 'Propiedad creada', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  { value: 'property.updated', label: 'Propiedad actualizada', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  { value: 'property.deleted', label: 'Propiedad eliminada', color: 'bg-red-500/15 text-red-700 dark:text-red-400' },
]

export function WebhookForm({ webhook, onClose, onSuccess, onToast }: WebhookFormProps) {
  const isEdit = !!webhook
  const [name, setName] = useState(webhook?.name ?? '')
  const [url, setUrl] = useState(webhook?.url ?? '')
  const [events, setEvents] = useState<string[]>(webhook?.events ?? [])
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(() => {
    if (webhook?.headers && typeof webhook.headers === 'object') {
      return Object.entries(webhook.headers as Record<string, string>).map(([key, value]) => ({ key, value }))
    }
    return []
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
    if (errors.events) setErrors((prev) => { const n = { ...prev }; delete n.events; return n })
  }

  const addHeader = () => setHeaders((prev) => [...prev, { key: '', value: '' }])

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setHeaders((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h))
  }

  const removeHeader = (index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRegenerate = async () => {
    if (!webhook) return
    setRegenerating(true)
    try {
      const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0')).join('')
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: newSecret }),
      })
      if (res.ok) {
        onToast('Secret regenerado', 'success')
        onSuccess()
      } else {
        onToast('Error al regenerar secret', 'error')
      }
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    const headersObj: Record<string, string> = {}
    for (const h of headers) {
      if (h.key.trim()) headersObj[h.key.trim()] = h.value.trim()
    }

    const payload = {
      name: name.trim(),
      url: url.trim(),
      events,
      headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
    }

    const apiUrl = isEdit ? `/api/webhooks/${webhook!.id}` : '/api/webhooks'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(apiUrl, {
        method,
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
          onToast(body.error || 'Error al guardar', 'error')
        }
        return
      }

      onToast(isEdit ? 'Webhook actualizado' : 'Webhook creado', 'success')
      onSuccess()
      onClose()
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (key: string) =>
    `w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border bg-bg-primary text-text-primary
    placeholder:text-text-tertiary transition-colors
    ${errors[key] ? 'border-red-500' : 'border-border-primary focus:border-orange'}
    focus:outline-none focus:ring-1 ${errors[key] ? 'focus:ring-red-500' : 'focus:ring-orange/30'}`

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-lg shadow-2xl my-8 mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? 'Editar Webhook' : 'Nuevo Webhook'}
          </h2>
          <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
            <input className={inputClass('name')} value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => { const n = { ...p }; delete n.name; return n }) }} placeholder="Mi webhook" />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">URL *</label>
            <input className={inputClass('url')} value={url} onChange={(e) => { setUrl(e.target.value); if (errors.url) setErrors((p) => { const n = { ...p }; delete n.url; return n }) }} placeholder="https://example.com/webhook" />
            {errors.url && <p className="text-xs text-red-500 mt-0.5">{errors.url}</p>}
          </div>

          {/* Events */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Eventos *</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleEvent(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer border
                    ${events.includes(opt.value)
                      ? `${opt.color} border-transparent`
                      : 'bg-bg-tertiary text-text-tertiary border-border-primary'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.events && <p className="text-xs text-red-500 mt-1">{errors.events}</p>}
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-secondary">Headers custom</label>
              <button
                type="button"
                onClick={addHeader}
                className="flex items-center gap-1 text-xs text-orange hover:text-orange-hover transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" strokeWidth={1.5} />
                Agregar
              </button>
            </div>
            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  className="flex-1 h-8 px-2 text-xs rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-orange"
                  placeholder="Header-Name"
                  value={h.key}
                  onChange={(e) => updateHeader(i, 'key', e.target.value)}
                />
                <input
                  className="flex-1 h-8 px-2 text-xs rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-orange"
                  placeholder="Valor"
                  value={h.value}
                  onChange={(e) => updateHeader(i, 'value', e.target.value)}
                />
                <button type="button" onClick={() => removeHeader(i)} className="p-1 text-text-tertiary hover:text-red-500 cursor-pointer transition-colors">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>

          {/* Secret (edit only) */}
          {isEdit && webhook?.secret && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Secret</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 h-8 px-2 flex items-center text-xs font-mono text-text-tertiary bg-bg-tertiary rounded-[var(--radius-sm)] border border-border-primary truncate">
                  {webhook.secret.slice(0, 8)}...
                </code>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="h-8 px-3 text-xs font-medium rounded-[var(--radius-sm)] border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {regenerating ? '...' : 'Regenerar'}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
