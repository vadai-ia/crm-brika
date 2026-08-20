'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, Loader2, Check } from 'lucide-react'
import type { ColumnVisibility } from '@/types'
import { Toast, type ToastType } from '@/components/ui/Toast'

const FILTER_TYPE_OPTIONS = [
  { value: 'none', label: 'Ninguno' },
  { value: 'select', label: 'Select' },
  { value: 'range', label: 'Rango' },
  { value: 'text', label: 'Texto' },
  { value: 'boolean', label: 'Sí/No' },
]

const COLUMN_GROUPS: { label: string; columns: string[] }[] = [
  { label: 'Info', columns: ['nombre_kibah', 'nombre_desarrollador', 'unidad', 'disponibilidad', 'fecha_actualizacion'] },
  { label: 'Ubicación', columns: ['direccion', 'colonia', 'alcaldia'] },
  { label: 'Precios', columns: ['precio_unidad'] },
  { label: 'Características', columns: ['m2_totales', 'm2_habitables', 'm2_exteriores', 'm2_roof_garden', 'num_recamaras', 'num_banos', 'estacionamiento', 'bodega', 'amenidades'] },
  { label: 'Entrega', columns: ['tipo_preventa', 'tipo_entrega', 'fecha_entrega'] },
  { label: 'Interno', columns: ['contacto_desarrollador', 'pct_comision', 'link_drive', 'id_propiedad', 'created_at'] },
]

type EditableColumn = ColumnVisibility & { _dirty?: boolean }

export function ColumnVisibilityManager() {
  const [columns, setColumns] = useState<EditableColumn[]>([])
  const [original, setOriginal] = useState<ColumnVisibility[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const fetchColumns = useCallback(async () => {
    try {
      const res = await fetch('/api/column-visibility')
      if (!res.ok) throw new Error('Error al cargar')
      const data: ColumnVisibility[] = await res.json()
      setColumns(data.map((c) => ({ ...c })))
      setOriginal(data)
    } catch {
      setToast({ message: 'Error al cargar columnas', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchColumns() }, [fetchColumns])

  const isDirty = (col: EditableColumn) => {
    const orig = original.find((o) => o.id === col.id)
    if (!orig) return false
    return (
      col.visible_to_asesores !== orig.visible_to_asesores ||
      col.display_label !== orig.display_label ||
      col.display_order !== orig.display_order ||
      col.filter_type !== orig.filter_type
    )
  }

  const changedCount = columns.filter(isDirty).length
  const hasChanges = changedCount > 0

  const updateColumn = (id: string, field: keyof EditableColumn, value: unknown) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const moveColumn = (id: string, direction: 'up' | 'down') => {
    setColumns((prev) => {
      const sorted = [...prev].sort((a, b) => a.display_order - b.display_order)
      const idx = sorted.findIndex((c) => c.id === id)
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev

      const a = sorted[idx]
      const b = sorted[swapIdx]
      return prev.map((c) => {
        if (c.id === a.id) return { ...c, display_order: b.display_order }
        if (c.id === b.id) return { ...c, display_order: a.display_order }
        return c
      })
    })
  }

  const handleSave = async () => {
    if (!hasChanges) {
      setToast({ message: 'No hay cambios', type: 'warning' })
      return
    }

    const visibleCount = columns.filter((c) => c.visible_to_asesores).length
    if (visibleCount === 0) {
      setToast({ message: 'Al menos 1 columna debe ser visible para asesores', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const payload = columns.map((c) => ({
        id: c.id,
        visible_to_asesores: c.visible_to_asesores,
        display_label: c.display_label || c.column_name,
        display_order: c.display_order,
        filter_type: c.filter_type || 'none',
      }))

      const res = await fetch('/api/column-visibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Error al guardar')
      }

      setOriginal(columns.map((c) => ({ ...c })))
      setToast({ message: 'Cambios guardados', type: 'success' })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  // Group columns by category (preserving unknown columns at end)
  const grouped = useMemo(() => {
    const byName = new Map(columns.map((c) => [c.column_name, c]))
    const assignedNames = new Set<string>()

    const result: { label: string; items: EditableColumn[] }[] = COLUMN_GROUPS.map((g) => {
      const items = g.columns
        .map((name) => byName.get(name))
        .filter((c): c is EditableColumn => !!c)
      items.forEach((c) => assignedNames.add(c.column_name))
      return { label: g.label, items }
    })

    const unassigned = columns.filter((c) => !assignedNames.has(c.column_name))
    if (unassigned.length > 0) result.push({ label: 'Otros', items: unassigned })

    return result.filter((g) => g.items.length > 0)
  }, [columns])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <div className="pb-20">
      {grouped.map((group) => (
        <div key={group.label}>
          <div
            className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b"
            style={{ borderColor: 'rgba(163, 28, 220, 0.15)' }}
          >
            <h3
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#A31CDC',
              }}
            >
              {group.label}
            </h3>
            <span className="text-[10px] text-text-tertiary">({group.items.length})</span>
          </div>

          <div className="space-y-1">
            {group.items.map((col) => {
              const dirty = isDirty(col)
              return (
                <div
                  key={col.id}
                  className={`flex items-center gap-3 px-3 rounded-[var(--radius-sm)] border transition-colors
                    ${dirty ? 'border-orange/40 bg-orange/5' : 'border-border-primary bg-bg-secondary'}`}
                  style={{ height: '40px' }}
                >
                  {/* Toggle — very clearly on/off */}
                  <button
                    onClick={() => updateColumn(col.id, 'visible_to_asesores', !col.visible_to_asesores)}
                    title={col.visible_to_asesores ? 'Visible para asesores' : 'Oculto para asesores'}
                    style={{
                      position: 'relative',
                      width: '36px',
                      height: '20px',
                      borderRadius: '9999px',
                      flexShrink: 0,
                      background: col.visible_to_asesores ? '#A31CDC' : '#374151',
                      border: col.visible_to_asesores ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: col.visible_to_asesores ? '18px' : '2px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        transition: 'left 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {col.visible_to_asesores && (
                        <Check className="w-2.5 h-2.5" style={{ color: '#A31CDC' }} strokeWidth={3} />
                      )}
                    </span>
                  </button>

                  {/* Label + technical name */}
                  <div className="flex-1 min-w-0">
                    <input
                      value={col.display_label ?? ''}
                      onChange={(e) => updateColumn(col.id, 'display_label', e.target.value)}
                      placeholder={col.column_name}
                      className="w-full bg-transparent text-[14px] font-medium focus:outline-none"
                      style={{ color: 'var(--text-primary)', border: 'none', padding: 0 }}
                    />
                    <div className="text-[11px] font-mono" style={{ color: '#6B7280' }}>
                      {col.column_name}
                    </div>
                  </div>

                  {/* Filter type */}
                  <select
                    value={col.filter_type ?? 'none'}
                    onChange={(e) => updateColumn(col.id, 'filter_type', e.target.value)}
                    className="h-7 px-2 text-[11px] rounded-md border border-border-primary
                      bg-bg-primary text-text-primary appearance-none cursor-pointer w-20 flex-shrink-0
                      focus:outline-none focus:border-orange"
                  >
                    {FILTER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {/* Reorder */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveColumn(col.id, 'up')}
                      className="p-1 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                      title="Subir"
                    >
                      <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => moveColumn(col.id, 'down')}
                      className="p-1 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                      title="Bajar"
                    >
                      <ArrowDown className="w-3 h-3" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Sticky save bar */}
      {hasChanges && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-primary px-6 py-3 brika-modal-solid"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#A31CDC' }} />
              <span className="font-medium" style={{ color: '#A31CDC' }}>
                {changedCount} cambio{changedCount !== 1 ? 's' : ''} sin guardar
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 text-sm font-medium rounded-lg bg-orange text-white hover:bg-orange-hover disabled:opacity-40 transition-colors cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
