'use client'

import { useCallback, useState } from 'react'
import { Plus, Building2, AlertCircle } from 'lucide-react'
import type { Desarrollo } from '@/types/desarrollo'
import type { ToastType } from '@/components/ui/Toast'
import { useDesarrollos } from '@/hooks/useDesarrollos'
import { useDesarrolloFilters } from '@/hooks/useDesarrolloFilters'
import { DesarrolloGrid } from '@/components/desarrollos/DesarrolloGrid'
import { DesarrolloTable } from '@/components/desarrollos/DesarrolloTable'
import { DesarrolloDetail } from '@/components/desarrollos/DesarrolloDetail'
import { DesarrolloForm } from '@/components/desarrollos/DesarrolloForm'
import { DesarrolloFilters } from '@/components/desarrollos/DesarrolloFilters'
import { ViewToggle } from '@/components/desarrollos/ViewToggle'
import { Toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type ViewMode = 'grid' | 'list'

export default function DesarrollosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selected, setSelected] = useState<Desarrollo | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Desarrollo | null>(null)
  const [deleting, setDeleting] = useState<Desarrollo | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const { activeFilters, debouncedFilters, setFilter } = useDesarrolloFilters()

  const {
    desarrollos, loading, loadingMore, error, hasMore, loadMore, retry, refetch,
  } = useDesarrollos(debouncedFilters)

  const showToast = useCallback((msg: string, type: ToastType) => setToast({ message: msg, type }), [])

  const handleCreate = useCallback(() => { setEditing(null); setFormOpen(true) }, [])
  const handleEdit = useCallback((d: Desarrollo) => { setEditing(d); setFormOpen(true) }, [])
  const handleDeleteRequest = useCallback((d: Desarrollo) => setDeleting(d), [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/desarrollos/${deleting.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        showToast('Desarrollo eliminado', 'success')
        setDeleting(null)
        refetch()
      } else {
        const body = await res.json().catch(() => ({}))
        showToast(body.error || 'Error al eliminar', 'error')
      }
    } catch { showToast('Error de conexión', 'error') }
    finally { setDeleteLoading(false) }
  }, [deleting, refetch, showToast])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brika-page-title">Desarrollos</h1>
          {!loading && desarrollos.length > 0 && (
            <p className="brika-page-desc mt-1">
              {desarrollos.length} desarrollo{desarrollos.length !== 1 ? 's' : ''}{hasMore ? '+' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCreate} className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer">
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Agregar Desarrollo
          </button>
          <ViewToggle onChange={setViewMode} />
        </div>
      </div>

      {/* Filters */}
      <DesarrolloFilters activeFilters={activeFilters} onSetFilter={setFilter} />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-sm)] bg-error/10 border border-error/20">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-error flex-1">{error}</p>
          <button onClick={retry} className="text-sm font-medium text-error hover:underline cursor-pointer">Reintentar</button>
        </div>
      )}

      {/* Content */}
      {!error && (
        <>
          {viewMode === 'grid' ? (
            <DesarrolloGrid desarrollos={desarrollos} loading={loading} onSelect={setSelected} onEdit={handleEdit} onDelete={handleDeleteRequest} />
          ) : (
            <DesarrolloTable desarrollos={desarrollos} loading={loading} onSelect={setSelected} onEdit={handleEdit} onDelete={handleDeleteRequest} />
          )}

          {!loading && desarrollos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="w-12 h-12 text-text-tertiary mb-4" strokeWidth={1.5} />
              <h2 className="text-base font-semibold text-text-primary mb-1">No hay desarrollos</h2>
              <p className="text-sm text-text-secondary mb-4">Agrega uno para empezar</p>
            </div>
          )}

          {hasMore && desarrollos.length > 0 && (
            <div className="flex justify-center pt-4">
              <button onClick={loadMore} disabled={loadingMore} className="h-10 px-6 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary disabled:opacity-50 transition-colors cursor-pointer">
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail */}
      {selected && (
        <DesarrolloDetail
          desarrollo={selected}
          onClose={() => setSelected(null)}
          onEdit={(d) => { setSelected(null); handleEdit(d) }}
          onDelete={(d) => { setSelected(null); handleDeleteRequest(d) }}
        />
      )}

      {/* Form */}
      {formOpen && (
        <DesarrolloForm
          desarrollo={editing}
          onClose={() => setFormOpen(false)}
          onSuccess={refetch}
          onToast={showToast}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <ConfirmDialog
          title="Eliminar Desarrollo"
          message={`¿Estás seguro de eliminar "${deleting.nombre_kibah || deleting.nombre_desarrollador || 'este desarrollo'}"?`}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleting(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
