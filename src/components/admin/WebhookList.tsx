'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, Play, Webhook, Loader2 } from 'lucide-react'
import type { Webhook as WebhookType } from '@/types'
import type { ToastType } from '@/components/ui/Toast'
import { Toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { WebhookForm } from './WebhookForm'

const EVENT_COLORS: Record<string, string> = {
  'property.created': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'property.updated': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'property.deleted': 'bg-red-500/15 text-red-700 dark:text-red-400',
}

const EVENT_LABELS: Record<string, string> = {
  'property.created': 'Creada',
  'property.updated': 'Actualizada',
  'property.deleted': 'Eliminada',
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Justo ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `hace ${days}d`
}

function statusBadge(code: number | null) {
  if (code === null || code === undefined) return <span className="text-xs text-text-tertiary">—</span>
  if (code >= 200 && code < 300) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{code}</span>
  }
  if (code >= 400 && code < 500) {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">{code}</span>
  }
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-400">{code || 'Error'}</span>
}

interface WebhookListProps {
  onCreateClick: () => void
}

export function WebhookList({ onCreateClick }: WebhookListProps) {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<WebhookType | null>(null)
  const [deleting, setDeleting] = useState<WebhookType | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks')
      if (!res.ok) return
      const json = await res.json()
      setWebhooks(json.data ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  const handleToggle = async (webhook: WebhookType) => {
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !webhook.is_active }),
      })
      if (res.ok) {
        setWebhooks((prev) =>
          prev.map((w) => w.id === webhook.id ? { ...w, is_active: !w.is_active } : w)
        )
      }
    } catch {
      showToast('Error al cambiar estado', 'error')
    }
  }

  const handleTest = async (webhook: WebhookType) => {
    setTestingId(webhook.id)
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}/test`, { method: 'POST' })
      const result = await res.json()
      if (result.success) {
        showToast(`Test exitoso (${result.statusCode})`, 'success')
      } else {
        showToast(`Test falló${result.statusCode ? ` (${result.statusCode})` : ''}: ${result.error || 'Error'}`, 'error')
      }
      fetchWebhooks()
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/webhooks/${deleting.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        showToast('Webhook eliminado', 'success')
        setDeleting(null)
        fetchWebhooks()
      } else {
        showToast('Error al eliminar', 'error')
      }
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  if (webhooks.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Webhook className="w-12 h-12 brika-empty-icon mb-4" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-text-primary mb-1">No hay webhooks configurados</h2>
          <p className="text-sm text-text-secondary mb-4">Crea uno para recibir notificaciones de cambios en propiedades</p>
          <button onClick={onCreateClick} className="brika-btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Crear Webhook
          </button>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {webhooks.map((webhook) => (
          <div
            key={webhook.id}
            className={`brika-card flex items-center gap-4 p-4 ${!webhook.is_active ? 'opacity-60' : ''}`}
          >
            {/* Toggle */}
            <button
              onClick={() => handleToggle(webhook)}
              className={`brika-toggle ${webhook.is_active ? 'brika-toggle-on' : 'brika-toggle-off'}`}
              title={webhook.is_active ? 'Desactivar' : 'Activar'}
            >
              <span className="brika-toggle-thumb" />
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-text-primary truncate">{webhook.name}</span>
                <span className={`brika-badge ${webhook.is_active ? 'brika-badge-active' : 'brika-badge-inactive'}`}>
                  {webhook.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-xs text-text-tertiary truncate mb-1.5" title={webhook.url}>{webhook.url}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {webhook.events.map((ev) => (
                  <span key={ev} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${EVENT_COLORS[ev] ?? 'bg-bg-tertiary text-text-tertiary'}`}>
                    {EVENT_LABELS[ev] ?? ev}
                  </span>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div>{statusBadge(webhook.last_status_code)}</div>
              <span className="text-[10px] text-text-tertiary">{timeAgo(webhook.last_triggered_at)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleTest(webhook)}
                disabled={testingId === webhook.id}
                className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50"
                title="Test"
              >
                {testingId === webhook.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                  : <Play className="w-3.5 h-3.5" strokeWidth={1.5} />
                }
              </button>
              <button
                onClick={() => setEditing(webhook)}
                className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer"
                title="Editar"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setDeleting(webhook)}
                className="p-1.5 rounded-[var(--radius-sm)] text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <WebhookForm
          webhook={editing}
          onClose={() => setEditing(null)}
          onSuccess={fetchWebhooks}
          onToast={showToast}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar Webhook"
          message={`¿Estás seguro de eliminar "${deleting.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
