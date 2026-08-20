'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Search, StickyNote, X } from 'lucide-react'
import type { Nota } from '@/lib/dal/anuncios'
import { NotaCard } from '@/components/anuncios/NotaCard'
import { NotaForm } from '@/components/anuncios/NotaForm'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type EstadoFilter = 'pendientes' | 'completadas' | 'todas'
type ScopeFilter = 'todas' | 'mias' | 'asignadas'

const ESTADO_TABS: Array<{ key: EstadoFilter; label: string }> = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'completadas', label: 'Completadas' },
  { key: 'todas', label: 'Todas' },
]

const SCOPE_TABS: Array<{ key: ScopeFilter; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'mias', label: 'Creadas por mí' },
  { key: 'asignadas', label: 'Asignadas a mí' },
]

interface Me {
  id: string
  isAdmin: boolean
}

function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export default function NotasPage() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [estado, setEstado] = useState<EstadoFilter>('pendientes')
  const [scope, setScope] = useState<ScopeFilter>('todas')
  const [query, setQuery] = useState('')

  const [formNota, setFormNota] = useState<Nota | null | 'new'>(null)
  const [confirmDelete, setConfirmDelete] = useState<Nota | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const load = useCallback(async (estadoFilter: EstadoFilter) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/anuncios?estado=${estadoFilter}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar notas')
      setNotas(json.data ?? [])
      setMe(json.me ?? null)
      setNextCursor(json.nextCursor ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(estado)
  }, [estado, load])

  const loadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/anuncios?estado=${estado}&before=${encodeURIComponent(nextCursor)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar más')
      setNotas((prev) => [...prev, ...(json.data ?? [])])
      setNextCursor(json.nextCursor ?? null)
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Error al cargar más', type: 'error' })
    } finally {
      setLoadingMore(false)
    }
  }

  const handleToggle = async (nota: Nota) => {
    try {
      const res = await fetch(`/api/anuncios/${nota.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completada: nota.completada !== true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al actualizar')
      const updated = json.data as Nota
      // Si con el filtro actual ya no aplica, se quita de la lista
      const sigueVisible =
        estado === 'todas' ||
        (estado === 'pendientes' && updated.completada !== true) ||
        (estado === 'completadas' && updated.completada === true)
      setNotas((prev) =>
        sigueVisible
          ? prev.map((n) => (n.id === updated.id ? updated : n))
          : prev.filter((n) => n.id !== updated.id)
      )
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Error al actualizar', type: 'error' })
    }
  }

  const handleSaved = (nota: Nota, isNew: boolean) => {
    setFormNota(null)
    if (isNew) {
      setNotas((prev) => [nota, ...prev])
      setToast({ message: 'Nota creada', type: 'success' })
    } else {
      setNotas((prev) => prev.map((n) => (n.id === nota.id ? nota : n)))
      setToast({ message: 'Nota actualizada', type: 'success' })
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/anuncios/${confirmDelete.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Error al eliminar')
      }
      setNotas((prev) => prev.filter((n) => n.id !== confirmDelete.id))
      setToast({ message: 'Nota eliminada', type: 'success' })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Error al eliminar', type: 'error' })
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  const q = normalize(query)
  const visibles = notas.filter((n) => {
    if (me && scope === 'mias' && n.id_creador !== me.id) return false
    if (me && scope === 'asignadas' && n.id_responsable !== me.id) return false
    if (!q) return true
    // Busca por título, texto de la nota o propiedad/lugar
    return [n.titulo, n.nota, n.propiedad_nombre]
      .map((v) => normalize(v))
      .join(' ')
      .includes(q)
  })

  const pill = (active: boolean) =>
    `px-3 h-8 text-xs font-medium rounded-full border transition-colors cursor-pointer ${
      active
        ? 'bg-orange text-white border-orange'
        : 'border-border-primary text-text-secondary hover:bg-bg-tertiary'
    }`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brika-page-title">Notas</h1>
          <p className="brika-page-desc mt-1">Notas y recordatorios del equipo</p>
        </div>
        <button onClick={() => setFormNota('new')} className="brika-btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Nueva nota
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ESTADO_TABS.map((t) => (
          <button key={t.key} onClick={() => setEstado(t.key)} className={pill(estado === t.key)}>
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border-primary" />
        {SCOPE_TABS.map((t) => (
          <button key={t.key} onClick={() => setScope(t.key)} className={pill(scope === t.key)}>
            {t.label}
          </button>
        ))}
        <div className="relative w-full sm:w-72 sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, nota o lugar..."
            className="brika-input"
            style={{ paddingLeft: '36px', paddingRight: '32px' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary hover:text-text-primary"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-text-tertiary">
          <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
          <span className="text-sm">Cargando notas...</span>
        </div>
      )}

      {!loading && error && (
        <div className="brika-card p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={() => load(estado)} className="brika-btn-secondary mt-3" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && visibles.length === 0 && (
        <div className="brika-card p-10 flex flex-col items-center text-center">
          <StickyNote className="w-8 h-8 text-text-tertiary mb-3" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">
            {q ? 'No hay notas que coincidan con tu búsqueda' : 'No hay notas aquí todavía'}
          </p>
          <p className="text-xs text-text-tertiary mt-1">
            {q ? 'Prueba con otra palabra o limpia la búsqueda' : 'Crea una con el botón “Nueva nota”'}
          </p>
        </div>
      )}

      {!loading && !error && visibles.length > 0 && me && (
        <div className="space-y-2">
          {visibles.map((n) => (
            <NotaCard
              key={n.id}
              nota={n}
              meId={me.id}
              isAdmin={me.isAdmin}
              onToggle={handleToggle}
              onEdit={(nota) => setFormNota(nota)}
              onDelete={(nota) => setConfirmDelete(nota)}
            />
          ))}
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <button onClick={loadMore} disabled={loadingMore} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                {loadingMore ? 'Cargando...' : 'Mostrar más'}
              </button>
            </div>
          )}
        </div>
      )}

      {formNota !== null && (
        <NotaForm
          initial={formNota === 'new' ? null : formNota}
          onClose={() => setFormNota(null)}
          onSaved={handleSaved}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar nota"
          message="¿Eliminar esta nota? Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
