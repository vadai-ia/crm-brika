'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Users, Loader2, SearchX } from 'lucide-react'
import type { Profile, ProfileWithAuth } from '@/types'
import type { Role } from '@/types/roles'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ROLE_ADMIN } from '@/lib/utils/constants'
import { AsesorToolbar, type StatusFilter } from './AsesorToolbar'
import { AsesorTable } from './AsesorTable'
import { AsesorDetail } from './AsesorDetail'

export interface AsesorPerms {
  isAdmin: boolean
  canEdit: boolean
  canDelete: boolean
}

interface AsesorListProps {
  onCreateClick: () => void
  refreshKey: number
  perms: AsesorPerms
  canCreate: boolean
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function AsesorList({ onCreateClick, refreshKey, perms, canCreate }: AsesorListProps) {
  const [rows, setRows] = useState<ProfileWithAuth[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const showToast = useCallback((message: string, type: ToastType) => setToast({ message, type }), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/asesores', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar usuarios')
      setRows(json.data ?? [])
      setNextCursor(json.nextCursor ?? null)
      setCurrentUserId(json.meta?.currentUserId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  useEffect(() => {
    fetch('/api/roles')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setRoles(json.data ?? []))
      .catch(() => {})
  }, [refreshKey])

  const loadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/asesores?before=${encodeURIComponent(nextCursor)}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar más')
      setRows((prev) => [...prev, ...(json.data ?? [])])
      setNextCursor(json.nextCursor ?? null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cargar más', 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const roleLabels = useMemo(
    () => Object.fromEntries(roles.map((r) => [r.name, r.display_name])) as Record<string, string>,
    [roles]
  )

  const visibles = useMemo(() => {
    const q = normalize(query)
    return rows.filter((r) => {
      if (roleFilter && r.role !== roleFilter) return false
      if (status === 'active' && !r.is_active) return false
      if (status === 'inactive' && r.is_active) return false
      if (!q) return true
      return [r.full_name, r.email, r.role, roleLabels[r.role], r.id].map(normalize).join(' ').includes(q)
    })
  }, [rows, query, roleFilter, status, roleLabels])

  const stats = useMemo(() => ({
    loaded: rows.length,
    activos: rows.filter((r) => r.is_active).length,
    inactivos: rows.filter((r) => !r.is_active).length,
    admins: rows.filter((r) => r.role === ROLE_ADMIN).length,
    hasMore: nextCursor !== null,
  }), [rows, nextCursor])

  const mergeProfile = useCallback((p: Profile) => {
    setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, ...p } : r)))
  }, [])

  const handleToggle = async (asesor: ProfileWithAuth) => {
    setBusyId(asesor.id)
    try {
      const res = await fetch(`/api/asesores/${asesor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !asesor.is_active }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(body.error || 'Error al cambiar estado', 'error')
        return
      }
      mergeProfile(body.data as Profile)
      showToast(asesor.is_active ? 'Usuario desactivado' : 'Usuario activado', 'success')
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleted = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id))
    setSelectedId(null)
  }

  const canToggle = useCallback(
    (row: ProfileWithAuth) => perms.canEdit && (perms.isAdmin || row.role !== ROLE_ADMIN),
    [perms]
  )

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-text-tertiary">
        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
        <span className="text-sm">Cargando usuarios…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="brika-card p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={load} className="brika-btn-secondary mt-3" style={{ padding: '8px 16px', fontSize: '13px' }}>
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <AsesorToolbar
          query={query} onQuery={setQuery}
          role={roleFilter} onRole={setRoleFilter}
          status={status} onStatus={setStatus}
          roles={roles}
          stats={stats}
        />

        {rows.length === 0 ? (
          <div className="brika-card flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 brika-empty-icon mb-4" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-text-primary mb-1">No hay usuarios registrados</h2>
            <p className="text-sm text-text-secondary mb-4">Crea uno para que pueda acceder a la plataforma</p>
            {canCreate && (
              <button onClick={onCreateClick} className="brika-btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                Crear usuario
              </button>
            )}
          </div>
        ) : visibles.length === 0 ? (
          <div className="brika-card p-10 flex flex-col items-center text-center">
            <SearchX className="w-8 h-8 text-text-tertiary mb-3" strokeWidth={1.5} />
            <p className="text-sm text-text-secondary">Ningún usuario coincide con los filtros</p>
            <button
              onClick={() => { setQuery(''); setRoleFilter(''); setStatus('all') }}
              className="brika-btn-secondary mt-3"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <AsesorTable
            rows={visibles}
            currentUserId={currentUserId}
            roleLabels={roleLabels}
            canToggle={canToggle}
            busyId={busyId}
            onSelect={(row) => setSelectedId(row.id)}
            onToggle={handleToggle}
          />
        )}

        {nextCursor && (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="brika-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              {loadingMore ? 'Cargando…' : 'Cargar más usuarios'}
            </button>
          </div>
        )}
      </div>

      {selected && (
        <AsesorDetail
          asesor={selected}
          roles={roles}
          currentUserId={currentUserId}
          isAdmin={perms.isAdmin}
          canEdit={perms.canEdit}
          canDelete={perms.canDelete}
          onClose={() => setSelectedId(null)}
          onToggle={handleToggle}
          onUpdated={mergeProfile}
          onDeleted={handleDeleted}
          onToast={showToast}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
