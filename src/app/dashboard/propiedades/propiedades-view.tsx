'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, AlertCircle, Plus, FileText } from 'lucide-react'
import type { Property, UserRole } from '@/types'
import type { ToastType } from '@/components/ui/Toast'
import { useProperties } from '@/hooks/useProperties'
import { useFilters } from '@/hooks/useFilters'
import { useColumnVisibility } from '@/hooks/useColumnVisibility'
import { usePermissions } from '@/hooks/usePermissions'
import { usePdfSelection } from '@/hooks/usePdfSelection'
import { PropertyFilters } from '@/components/properties/PropertyFilters'
import { SavedFiltersBar } from '@/components/properties/SavedFiltersBar'
import { PropertyGrid } from '@/components/properties/PropertyGrid'
import { PropertyTable } from '@/components/properties/PropertyTable'
import { PropertyDetail } from '@/components/properties/PropertyDetail'
import { PropertyForm } from '@/components/properties/PropertyForm'
import { ViewToggle } from '@/components/properties/ViewToggle'
import { Toast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type ViewMode = 'grid' | 'list'

interface ToastState {
  message: string
  type: ToastType
}

export function PropiedadesView({ role }: { role: UserRole }) {
  const { can } = usePermissions()
  const isAdmin = role === 'admin'
  const canCreate = can('propiedades.create')
  const canEdit = can('propiedades.edit')
  const canDelete = can('propiedades.delete')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  // CRUD state
  const [formOpen, setFormOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [deletingProperty, setDeletingProperty] = useState<Property | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)

  // PDF selection
  const { selectedProperties: pdfProperties, count: pdfCount, toggleProperty: togglePdf } = usePdfSelection()
  const pdfSelectedIds = useMemo(() => new Set(pdfProperties.map((p) => p.id)), [pdfProperties])

  const {
    activeFilters,
    debouncedFilters,
    filterChips,
    setFilter,
    removeFilter,
    clearAll,
    replaceAll,
  } = useFilters()

  const {
    properties,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    sortConfig,
    setSortConfig,
    retry,
    refetch,
  } = useProperties(debouncedFilters)

  const { visibleColumns, filterableColumns } = useColumnVisibility(role)

  const visibleColumnNames = useMemo(
    () => new Set(visibleColumns.map((c) => c.column_name)),
    [visibleColumns]
  )

  const handleSort = useCallback(
    (column: string) => {
      setSortConfig({
        column,
        order:
          sortConfig.column === column && sortConfig.order === 'desc'
            ? 'asc'
            : 'desc',
      })
    },
    [sortConfig, setSortConfig]
  )

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
  }, [])

  // CRUD handlers
  const handleCreate = useCallback(() => {
    setEditingProperty(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((property: Property) => {
    setEditingProperty(property)
    setFormOpen(true)
  }, [])

  const handleDeleteRequest = useCallback((property: Property) => {
    setDeletingProperty(property)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingProperty) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/properties/${deletingProperty.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        showToast(body.error || 'Error al eliminar', 'error')
        return
      }
      showToast('Propiedad eliminada', 'success')
      setDeletingProperty(null)
      refetch()
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }, [deletingProperty, refetch, showToast])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Propiedades
          </h1>
          {!loading && properties.length > 0 && (
            <p className="text-sm text-text-secondary mt-0.5">
              {properties.length} propiedad{properties.length !== 1 ? 'es' : ''}{hasMore ? '+' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
                bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Agregar Propiedad
            </button>
          )}
          <ViewToggle onChange={handleViewChange} />
        </div>
      </div>

      {/* Saved filters bar */}
      <SavedFiltersBar
        activeFilters={activeFilters}
        hasActiveFilters={Object.keys(activeFilters).length > 0}
        onApply={replaceAll}
        onToast={showToast}
      />

      {/* Filters */}
      <PropertyFilters
        filterableColumns={filterableColumns}
        activeFilters={activeFilters}
        filterChips={filterChips}
        onSetFilter={setFilter}
        onRemoveFilter={removeFilter}
        onClearAll={clearAll}
      />

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius-sm)] bg-error/10 border border-error/20">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-error flex-1">{error}</p>
          <button
            onClick={retry}
            className="text-sm font-medium text-error hover:underline cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Content */}
      {!error && (
        <>
          {viewMode === 'grid' ? (
            <PropertyGrid
              properties={properties}
              loading={loading}
              onSelect={setSelectedProperty}
              role={role}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDeleteRequest : undefined}
              visibleColumnNames={visibleColumnNames}
              pdfSelectedIds={pdfSelectedIds}
              onTogglePdf={togglePdf}
            />
          ) : (
            <PropertyTable
              properties={properties}
              loading={loading}
              columns={visibleColumns}
              sortConfig={sortConfig}
              onSort={handleSort}
              onSelect={setSelectedProperty}
              role={role}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? handleDeleteRequest : undefined}
              visibleColumnNames={visibleColumnNames}
              pdfSelectedIds={pdfSelectedIds}
              onTogglePdf={togglePdf}
            />
          )}

          {/* Empty state */}
          {!loading && properties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2
                className="w-12 h-12 text-text-tertiary mb-4"
                strokeWidth={1.5}
              />
              <h2 className="text-base font-semibold text-text-primary mb-1">
                No hay propiedades con estos filtros
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Intenta ajustar los filtros para ver más resultados
              </p>
              {filterChips.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm font-medium text-orange hover:text-orange-hover transition-colors cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Load more */}
          {hasMore && properties.length > 0 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="h-10 px-6 text-sm font-medium rounded-[var(--radius-sm)]
                  bg-bg-tertiary text-text-primary hover:bg-border-primary
                  disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedProperty && (
        <PropertyDetail
          property={selectedProperty}
          role={role}
          onClose={() => setSelectedProperty(null)}
          onEdit={(p) => { setSelectedProperty(null); handleEdit(p) }}
          onDelete={(p) => { setSelectedProperty(null); handleDeleteRequest(p) }}
          visibleColumnNames={visibleColumnNames}
        />
      )}

      {/* Property form modal */}
      {formOpen && (
        <PropertyForm
          property={editingProperty}
          onClose={() => setFormOpen(false)}
          onSuccess={refetch}
          onToast={showToast}
        />
      )}

      {/* Delete confirmation */}
      {deletingProperty && (
        <ConfirmDialog
          title="Eliminar Propiedad"
          message={`¿Estás seguro de eliminar "${deletingProperty.nombre_kibah || deletingProperty.nombre_desarrollador || 'esta propiedad'}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingProperty(null)}
        />
      )}

      {/* PDF floating banner */}
      {pdfCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-full
          bg-navy text-white shadow-lg border border-white/10">
          <FileText className="w-4 h-4 text-orange" strokeWidth={1.5} />
          <span className="text-sm font-medium">{pdfCount} propiedad{pdfCount !== 1 ? 'es' : ''}</span>
          <Link
            href="/dashboard/pdf"
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-orange text-white hover:bg-orange-hover transition-colors"
          >
            Generar PDF
          </Link>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
