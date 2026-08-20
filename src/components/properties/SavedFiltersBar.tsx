'use client'

import { useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkPlus, ChevronDown, X } from 'lucide-react'
import { useSavedFilters, type SavedFilter } from '@/hooks/useSavedFilters'
import type { ToastType } from '@/components/ui/Toast'

interface SavedFiltersBarProps {
  activeFilters: Record<string, string>
  hasActiveFilters: boolean
  onApply: (filters: Record<string, string>) => void
  onToast: (message: string, type: ToastType) => void
}

export function SavedFiltersBar({ activeFilters, hasActiveFilters, onApply, onToast }: SavedFiltersBarProps) {
  const { savedFilters, saveFilter, deleteFilter } = useSavedFilters()
  const [open, setOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<SavedFilter | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      onToast('Nombre requerido', 'error')
      return
    }
    setSaving(true)
    const res = await saveFilter(trimmed, activeFilters)
    setSaving(false)
    if (res.ok) {
      onToast('Filtro guardado', 'success')
      setSaveModalOpen(false)
      setName('')
    } else {
      onToast(res.error || 'Error al guardar', 'error')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    const ok = await deleteFilter(confirmDelete.id)
    if (ok) onToast('Filtro eliminado', 'success')
    else onToast('Error al eliminar', 'error')
    setConfirmDelete(null)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-[var(--radius-sm)] border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" strokeWidth={1.5} />
            Filtros guardados
            <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
          </button>

          {open && (
            <div className="absolute top-full left-0 mt-1 w-64 z-20 brika-modal-solid border border-border-primary rounded-[var(--radius-sm)] shadow-xl py-1">
              {savedFilters.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-tertiary">Sin filtros guardados</p>
              ) : (
                savedFilters.map((f) => (
                  <div key={f.id} className="flex items-center gap-1 px-1">
                    <button
                      onClick={() => { onApply(f.filters); setOpen(false) }}
                      className="flex-1 text-left px-2 py-1.5 text-sm text-text-primary rounded hover:bg-bg-tertiary transition-colors cursor-pointer truncate"
                    >
                      {f.name}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(f)}
                      className="p-1 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => setSaveModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-[var(--radius-sm)] border border-orange/30 text-orange hover:bg-orange/10 transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Guardar filtros
          </button>
        )}
      </div>

      {saveModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            onClick={() => setSaveModalOpen(false)}
          />
          <div className="relative brika-modal-solid border border-border-primary p-6 w-full max-w-sm shadow-2xl mx-4" style={{ borderRadius: '16px' }}>
            <h3 className="text-base font-semibold text-text-primary mb-1">Guardar filtros</h3>
            <p className="text-xs text-text-tertiary mb-4">Dale un nombre para identificar este filtro</p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder="ej: Cliente Juan Pérez"
              className="brika-input"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSaveModalOpen(false)}
                disabled={saving}
                className="brika-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="brika-btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative brika-modal-solid border border-border-primary p-6 w-full max-w-sm shadow-2xl mx-4" style={{ borderRadius: '16px' }}>
            <h3 className="text-base font-semibold text-text-primary mb-1">Eliminar filtro</h3>
            <p className="text-sm text-text-secondary mb-6">¿Eliminar &ldquo;{confirmDelete.name}&rdquo;?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="brika-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="brika-btn-danger"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
