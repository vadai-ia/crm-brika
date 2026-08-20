'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  color: string
}

const COLORS = [
  '#A31CDC', '#3B82F6', '#10B981', '#8B5CF6',
  '#F59E0B', '#EC4899', '#06B6D4', '#F97316',
  '#EF4444', '#6B7280', '#212121', '#84CC16',
]

interface CategoryManagerProps {
  onClose: () => void
  onChanged: () => void
}

export function CategoryManager({ onClose, onChanged }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/categories')
      if (res.ok) { const json = await res.json(); setCategories(json.data ?? []) }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/calendar/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      if (res.ok) { setNewName(''); fetch_(); onChanged() }
    } catch {} finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/calendar/categories/${id}`, { method: 'DELETE' })
      fetch_(); onChanged()
    } catch {}
  }

  const handleUpdate = async (cat: Category, name: string, color: string) => {
    try {
      await fetch(`/api/calendar/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      fetch_(); onChanged()
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-md shadow-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary sticky top-0 bg-bg-primary z-10">
          <h2 className="text-base font-semibold text-text-primary">Categorias</h2>
          <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary"><X className="w-5 h-5" strokeWidth={1.5} /></button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-text-tertiary animate-spin" strokeWidth={1.5} /></div>
          ) : (
            <>
              {categories.length === 0 && (
                <p className="text-xs text-text-tertiary">No tienes categorias. Ideas: Reunion, Llamada, Capacitacion, Visita, Personal, Seguimiento</p>
              )}

              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <div className="flex gap-1 flex-shrink-0">
                    {COLORS.slice(0, 6).map((c) => (
                      <button key={c} onClick={() => handleUpdate(cat, cat.name, c)}
                        className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${cat.color === c ? 'ring-2 ring-offset-1 ring-offset-bg-primary scale-110' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <input
                    defaultValue={cat.name}
                    onBlur={(e) => { if (e.target.value !== cat.name) handleUpdate(cat, e.target.value, cat.color) }}
                    className="flex-1 h-8 px-2 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary focus:outline-none focus:border-orange"
                  />
                  <button onClick={() => handleDelete(cat.id)} className="p-1 text-text-tertiary hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /></button>
                </div>
              ))}

              {/* Add new */}
              <div className="border-t border-border-primary pt-4 space-y-2">
                <div className="flex gap-1">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${newColor === c ? 'ring-2 ring-offset-1 ring-offset-bg-primary scale-110' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre de categoria"
                    className="flex-1 h-8 px-2 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-orange"
                  />
                  <button onClick={handleCreate} disabled={saving || !newName.trim()}
                    className="h-8 px-3 text-xs font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 cursor-pointer flex items-center gap-1">
                    <Plus className="w-3 h-3" strokeWidth={2} /> Agregar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
