'use client'

import { useCallback, useEffect, useState } from 'react'
import { Key, Loader2 } from 'lucide-react'
import type { ApiKey } from '@/types'
import type { ToastType } from '@/components/ui/Toast'
import { Toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

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

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return 'Sin expiración'
  const d = new Date(dateStr)
  if (d < new Date()) return 'Expirada'
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface ApiKeyListProps {
  onCreateClick: () => void
  refreshKey: number
}

export function ApiKeyList({ onCreateClick, refreshKey }: ApiKeyListProps) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/api-keys')
      if (!res.ok) return
      const json = await res.json()
      setKeys(json.data ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys, refreshKey])

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  const handleRevoke = async () => {
    if (!revoking) return
    setRevokeLoading(true)
    try {
      const res = await fetch(`/api/api-keys/${revoking.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        showToast('API key revocada', 'success')
        setRevoking(null)
        fetchKeys()
      } else {
        showToast('Error al revocar', 'error')
      }
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setRevokeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  if (keys.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Key className="w-12 h-12 brika-empty-icon mb-4" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-text-primary mb-1">No hay API keys</h2>
          <p className="text-sm text-text-secondary mb-4">Crea una para que sistemas externos consulten propiedades</p>
          <button onClick={onCreateClick} className="brika-btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Crear API Key
          </button>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {keys.map((apiKey) => (
          <div
            key={apiKey.id}
            className={`brika-card flex items-center gap-4 p-4 ${!apiKey.is_active ? 'opacity-60' : ''}`}
          >
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-medium text-text-primary truncate">{apiKey.name}</span>
                <span className={`brika-badge ${apiKey.is_active ? 'brika-badge-active' : 'brika-badge-inactive'}`}>
                  {apiKey.is_active ? 'Activa' : 'Revocada'}
                </span>
              </div>
              <span className="brika-mono-pill">{apiKey.key_prefix}...</span>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {apiKey.permissions.map((perm) => (
                  <span key={perm} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange/15 text-orange">
                    {perm}
                  </span>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
              <span className="text-[10px] text-text-tertiary">Último uso: {timeAgo(apiKey.last_used_at)}</span>
              <span className="text-[10px] text-text-tertiary">{formatExpiry(apiKey.expires_at)}</span>
            </div>

            {/* Actions */}
            {apiKey.is_active && (
              <button
                onClick={() => setRevoking(apiKey)}
                className="h-8 px-3 text-xs font-medium rounded-[var(--radius-sm)] border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer flex-shrink-0"
              >
                Revocar
              </button>
            )}
          </div>
        ))}
      </div>

      {revoking && (
        <ConfirmDialog
          title="Revocar API Key"
          message={`¿Estás seguro de revocar "${revoking.name}"? Los sistemas que la usen dejarán de tener acceso.`}
          confirmLabel="Revocar"
          variant="danger"
          loading={revokeLoading}
          onConfirm={handleRevoke}
          onCancel={() => setRevoking(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
