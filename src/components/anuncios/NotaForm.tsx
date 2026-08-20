'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import type { Nota } from '@/lib/dal/anuncios'

interface UsuarioOption {
  id: string
  full_name: string | null
}

interface PropiedadOption {
  id: string
  label: string
}

interface NotaFormProps {
  initial: Nota | null
  onClose: () => void
  onSaved: (nota: Nota, isNew: boolean) => void
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export function NotaForm({ initial, onClose, onSaved }: NotaFormProps) {
  const isNew = initial === null
  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [nota, setNota] = useState(initial?.nota ?? '')
  const [idResponsable, setIdResponsable] = useState(initial?.id_responsable ?? '')
  const [idPropiedad, setIdPropiedad] = useState(initial?.id_propiedad ?? '')
  const [beforeDate, setBeforeDate] = useState(initial?.after_date ?? '')

  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([])
  const [propiedades, setPropiedades] = useState<PropiedadOption[]>([])
  const [propQuery, setPropQuery] = useState('')
  const [propOpen, setPropOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/anuncios/usuarios')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setUsuarios(json.data ?? []))
      .catch(() => setUsuarios([]))
    fetch('/api/anuncios/propiedades')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setPropiedades(json.data ?? []))
      .catch(() => setPropiedades([]))
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const selectedProp = propiedades.find((p) => p.id === idPropiedad) ?? null
  const filteredProps = useMemo(() => {
    const q = normalize(propQuery)
    if (!q) return propiedades
    return propiedades.filter((p) => normalize(p.label).includes(q))
  }, [propiedades, propQuery])

  const handleSubmit = async () => {
    if (!nota.trim()) {
      setError('Escribe la nota')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        titulo: titulo.trim() || null,
        nota: nota.trim(),
        id_responsable: idResponsable || null,
        id_propiedad: idPropiedad || null,
        after_date: beforeDate || null,
      }
      const res = await fetch(isNew ? '/api/anuncios' : `/api/anuncios/${initial.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')
      onSaved(json.data as Nota, isNew)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        onClick={onClose}
      />
      <div
        className="relative brika-modal-solid border border-border-primary p-6 w-full max-w-lg shadow-2xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: '16px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isNew ? 'Nueva nota' : 'Editar nota'}
          </h3>
          <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="brika-label">Título (opcional)</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Llamar al cliente"
              maxLength={200}
              className="brika-input"
            />
          </div>

          <div>
            <label className="brika-label">Nota *</label>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Escribe la nota o recordatorio..."
              rows={4}
              className="brika-input resize-y"
              style={{ height: 'auto', minHeight: '90px', paddingTop: '8px' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="brika-label">Responsable (opcional)</label>
              <select
                value={idResponsable}
                onChange={(e) => setIdResponsable(e.target.value)}
                className="brika-input cursor-pointer"
              >
                <option value="">Sin responsable</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="brika-label">Preferible hacer antes de (opcional)</label>
              <input
                type="date"
                value={beforeDate}
                onChange={(e) => setBeforeDate(e.target.value)}
                className="brika-input cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="brika-label">Propiedad relacionada (opcional)</label>
            {selectedProp ? (
              <div className="flex items-center gap-2 h-9 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary">
                <span className="flex-1 truncate">{selectedProp.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIdPropiedad('')
                    setPropQuery('')
                  }}
                  title="Quitar propiedad"
                  className="cursor-pointer text-text-tertiary hover:text-text-primary"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
                <input
                  type="text"
                  value={propQuery}
                  onChange={(e) => {
                    setPropQuery(e.target.value)
                    setPropOpen(true)
                  }}
                  onFocus={() => setPropOpen(true)}
                  onBlur={() => setTimeout(() => setPropOpen(false), 150)}
                  placeholder="Buscar propiedad..."
                  className="brika-input"
                  style={{ paddingLeft: '36px' }}
                />
                {propOpen && (
                  <div className="absolute z-10 mt-1 w-full max-h-44 overflow-y-auto rounded-[var(--radius-sm)] border border-border-primary brika-modal-solid shadow-lg">
                    {filteredProps.length === 0 && (
                      <p className="px-3 py-2 text-xs text-text-tertiary">Sin resultados</p>
                    )}
                    {filteredProps.slice(0, 60).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => {
                          setIdPropiedad(p.id)
                          setPropOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary cursor-pointer truncate"
                      >
                        {p.label}
                      </button>
                    ))}
                    {filteredProps.length > 60 && (
                      <p className="px-3 py-2 text-xs text-text-tertiary">
                        {filteredProps.length - 60} más — sigue escribiendo para afinar
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="brika-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !nota.trim()}
            className="brika-btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                Guardando...
              </>
            ) : (
              isNew ? 'Crear nota' : 'Guardar cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
