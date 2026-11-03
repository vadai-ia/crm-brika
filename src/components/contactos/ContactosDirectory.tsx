'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Contact, Layers, Loader2, Search, SearchX, X } from 'lucide-react'
import type { ContactoParque } from '@/types/contactos'
import { Toast } from '@/components/ui/Toast'
import { ParqueMultiSelect } from './ParqueMultiSelect'
import { ContactosTable, type SortKey, type SortState } from './ContactosTable'

function normalize(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Para ordenar por comisión: "0.05" → 5, "4 - 5.5%" → 4 (primer número)
function comisionValue(r: ContactoParque): number {
  const first = r.comisiones[0]?.match(/\d+(\.\d+)?/)?.[0]
  if (!first) return -1
  const n = parseFloat(first)
  return n <= 1 ? n * 100 : n
}

const uniq = (values: (string | null)[]) =>
  Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'es'))

const SELECT_CLASS =
  'h-10 w-full sm:w-48 px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-input-focus-ring'

export function ContactosDirectory() {
  const [rows, setRows] = useState<ContactoParque[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [parques, setParques] = useState<string[]>([])
  const [estado, setEstado] = useState('')
  const [contacto, setContacto] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'parque', dir: 'asc' })
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/contactos', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar contactos')
      setRows(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contactos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const parqueOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) if (r.parque) counts.set(r.parque, (counts.get(r.parque) ?? 0) + r.unidades.length)
    return uniq(rows.map((r) => r.parque)).map((value) => ({ value, count: counts.get(value) ?? 0 }))
  }, [rows])
  const estadoOptions = useMemo(() => uniq(rows.map((r) => r.estado)), [rows])
  const contactoOptions = useMemo(() => uniq(rows.map((r) => r.contacto)), [rows])

  const visibles = useMemo(() => {
    const q = normalize(query)
    const filtered = rows.filter((r) => {
      if (parques.length > 0 && !(r.parque && parques.includes(r.parque))) return false
      if (estado && r.estado !== estado) return false
      if (contacto && r.contacto !== contacto) return false
      if (!q) return true
      const haystack = [r.parque, r.contacto, r.celular, r.correo, r.municipio, r.estado, r.zona_corredor, ...r.unidades.map((u) => u.unidad)]
        .map(normalize)
        .join(' ')
      // También busca por teléfono sin espacios ni paréntesis
      const digits = q.replace(/\D/g, '')
      return haystack.includes(q) || (digits.length >= 4 && (r.celular ?? '').replace(/\D/g, '').includes(digits))
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    const text = (a: string | null, b: string | null) => (a ?? '').localeCompare(b ?? '', 'es', { numeric: true })
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case 'contacto': return dir * text(a.contacto, b.contacto)
        case 'unidades': return dir * (a.unidades.length - b.unidades.length)
        case 'comision': return dir * (comisionValue(a) - comisionValue(b))
        default: return dir * text(a.parque, b.parque)
      }
    })
  }, [rows, query, parques, estado, contacto, sort])

  const stats = useMemo(() => ({
    parques: new Set(visibles.map((r) => r.parque)).size,
    contactos: new Set(visibles.map((r) => `${r.contacto}|${r.celular}|${r.correo}`)).size,
    unidades: visibles.reduce((sum, r) => sum + r.unidades.length, 0),
  }), [visibles])

  const hasFilters = query !== '' || parques.length > 0 || estado !== '' || contacto !== ''
  const clearAll = () => { setQuery(''); setParques([]); setEstado(''); setContacto('') }

  const onSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'unidades' || key === 'comision' ? 'desc' : 'asc' }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-text-tertiary">
        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
        <span className="text-sm">Cargando contactos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="brika-card brika-card-flat p-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={load} className="brika-btn-secondary mt-3" style={{ padding: '8px 16px', fontSize: '13px' }}>
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen (refleja los filtros activos) */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Contactos', value: stats.contactos, icon: Contact },
          { label: 'Parques', value: stats.parques, icon: Building2 },
          { label: 'Unidades', value: stats.unidades, icon: Layers },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="brika-card brika-card-flat px-4 py-3 flex items-center gap-3">
            <span className="hidden sm:flex w-9 h-9 rounded-[8px] bg-orange/10 text-orange items-center justify-center">
              <Icon className="w-4 h-4" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-xl font-semibold text-text-primary tabular-nums leading-tight">{value}</p>
              <p className="text-xs text-text-tertiary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nombre, teléfono, correo, unidad..."
            className="brika-input !h-10"
            style={{ paddingLeft: '36px', paddingRight: '32px' }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary hover:text-text-primary">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <ParqueMultiSelect options={parqueOptions} selected={parques} onChange={setParques} />

        <select value={contacto} onChange={(e) => setContacto(e.target.value)} aria-label="Contacto"
          className={`${SELECT_CLASS} ${contacto ? 'border-orange/50' : 'border-input-border'}`}>
          <option value="">Todos los contactos</option>
          {contactoOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {estadoOptions.length > 1 && (
          <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado"
            className={`${SELECT_CLASS} ${estado ? 'border-orange/50' : 'border-input-border'}`}>
            <option value="">Todos los estados</option>
            {estadoOptions.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        )}

        {hasFilters && (
          <button type="button" onClick={clearAll}
            className="h-10 px-3 inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:bg-orange/10 rounded-[var(--radius-sm)] cursor-pointer">
            <X className="w-4 h-4" strokeWidth={1.5} />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Chips de parques seleccionados */}
      {parques.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {parques.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-orange/10 text-orange text-xs font-medium">
              {p}
              <button type="button" onClick={() => setParques(parques.filter((x) => x !== p))} aria-label={`Quitar ${p}`}
                className="w-4 h-4 rounded-full hover:bg-orange/20 flex items-center justify-center cursor-pointer">
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      {visibles.length === 0 ? (
        <div className="brika-card brika-card-flat p-10 flex flex-col items-center text-center">
          <SearchX className="w-8 h-8 text-text-tertiary mb-3" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">
            {hasFilters ? 'Ningún contacto coincide con los filtros' : 'Aún no hay contactos en el inventario'}
          </p>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs font-medium text-orange hover:underline mt-2 cursor-pointer">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <ContactosTable rows={visibles} sort={sort} onSort={onSort} onCopied={setToast} />
      )}

      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}
    </div>
  )
}
