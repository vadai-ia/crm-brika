'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import type { CartaProperty } from '@/types/carta-propuesta'
import { precioListado } from '@/lib/utils/inventario'

interface PropertyPickerProps {
  selectedId: string | null
  onSelect: (property: CartaProperty) => void
}

function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

const PAGE_SIZE = 50

export function PropertyPicker({ selectedId, onSelect }: PropertyPickerProps) {
  const [all, setAll] = useState<CartaProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    // `loading` arranca en true; aquí solo se resuelve
    fetch('/api/carta-propuesta/properties')
      .then(async (r) => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(json.error ?? 'Error al cargar propiedades')
        setAll(json.data ?? [])
        setError(null)
      })
      .catch((err) => {
        setAll([])
        setError(err instanceof Error ? err.message : 'Error al cargar propiedades')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return all
    return all.filter((p) =>
      [p.parque, p.unidad, p.zona_corredor, p.municipio, p.producto, p.operacion]
        .map(normalize)
        .join(' ')
        .includes(q)
    )
  }, [all, query])

  // Al cambiar la búsqueda se reinicia el paginado (sin efecto: se hace en el handler)
  const changeQuery = (q: string) => {
    setQuery(q)
    setVisibleCount(PAGE_SIZE)
  }

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder="Buscar por parque, unidad, zona, municipio…"
          className="w-full h-9 pl-9 pr-8 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => changeQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary hover:text-text-primary"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1 rounded-[var(--radius-sm)] border border-border-primary p-2">
        {loading && (
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" strokeWidth={1.5} />
            <span className="text-xs text-text-tertiary">Cargando propiedades...</span>
          </div>
        )}
        {!loading && error && <p className="text-xs text-red-500 text-center py-4">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-4">No hay resultados</p>
        )}
        {!loading &&
          visible.map((p) => {
            const selected = selectedId === p.id
            const subtitle = [p.producto, p.zona_corredor, p.operacion, precioListado(p)].filter(Boolean).join(' · ')
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-left transition-colors cursor-pointer
                  ${selected ? 'bg-orange/10 border border-orange' : 'hover:bg-bg-tertiary border border-transparent'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {p.parque ?? 'Sin parque'}{p.unidad ? ` · Unidad ${p.unidad}` : ''}
                  </p>
                  <p className="text-xs text-text-tertiary truncate">{subtitle}</p>
                </div>
              </button>
            )
          })}
        {!loading && hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="w-full text-center text-xs text-orange hover:text-orange-hover py-2 cursor-pointer"
          >
            Mostrar más ({filtered.length - visibleCount} restantes)
          </button>
        )}
      </div>
    </div>
  )
}
