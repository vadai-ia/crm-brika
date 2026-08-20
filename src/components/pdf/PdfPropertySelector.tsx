'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, X, Check, Loader2 } from 'lucide-react'
import type { Property } from '@/types'
import type { InventarioListItem } from '@/types/inventario'
import { normalizeKey } from '@/lib/utils/normalize'
import { precioListado } from '@/lib/utils/inventario'

interface PdfPropertySelectorProps {
  selectedIds: Set<Property['id']>
  onAdd: (property: Property) => void
  onRemove: (id: Property['id']) => void
}

function haystack(i: InventarioListItem): string {
  return normalizeKey(
    [i.parque, i.unidad, i.zona_corredor, i.municipio, i.estado, i.producto, i.tipo_producto, i.operacion]
      .filter(Boolean)
      .join(' ')
  )
}

/**
 * Selector de propiedades para la ficha: carga TODO el inventario una vez
 * (versión ligera) y busca en el cliente sin paginar. Al marcar una
 * propiedad se pide su ficha completa a /api/properties/[id].
 */
export function PdfPropertySelector({ selectedIds, onAdd, onRemove }: PdfPropertySelectorProps) {
  const [items, setItems] = useState<InventarioListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/pdf/properties', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar propiedades')
      setItems(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar propiedades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Property.id viene como uuid (string) aunque el type legacy diga number (ERROR-JOURNAL #12)
  const selectedKeys = useMemo(() => new Set([...selectedIds].map(String)), [selectedIds])

  // Búsqueda sin acentos/mayúsculas; varias palabras = todas deben coincidir ("acupark 14")
  const tokens = useMemo(() => normalizeKey(query).split(' ').filter(Boolean), [query])
  const visible = useMemo(() => {
    if (tokens.length === 0) return items
    return items.filter((i) => {
      const h = haystack(i)
      return tokens.every((t) => h.includes(t))
    })
  }, [items, tokens])

  const handleToggle = async (item: InventarioListItem) => {
    if (selectedKeys.has(item.id)) {
      onRemove(item.id as unknown as Property['id'])
      return
    }
    setBusyId(item.id)
    setRowError(null)
    try {
      const res = await fetch(`/api/properties/${item.id}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'No se pudo cargar la propiedad')
      onAdd(json.data as Property)
    } catch (err) {
      setRowError(err instanceof Error ? err.message : 'No se pudo cargar la propiedad')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por parque, unidad, zona, municipio, tipo u operación…"
          className="w-full h-9 pl-9 pr-8 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-text-tertiary hover:text-text-primary"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {!loading && !error && (
        <p className="text-xs text-text-tertiary">
          {items.length} propiedades en inventario
          {tokens.length > 0 && ` · ${visible.length} coinciden`}
          {selectedKeys.size > 0 && ` · ${selectedKeys.size} en la ficha`}
        </p>
      )}
      {rowError && <p className="text-xs text-red-500">{rowError}</p>}

      <div className="max-h-80 overflow-y-auto space-y-1 rounded-[var(--radius-sm)] border border-border-primary p-2">
        {loading && (
          <div className="flex items-center justify-center py-4 gap-2 text-text-tertiary">
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            <span className="text-xs">Cargando inventario…</span>
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-4">
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={load} className="text-xs text-orange hover:underline mt-1 cursor-pointer">Reintentar</button>
          </div>
        )}
        {!loading && !error && visible.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-4">
            {items.length === 0 ? 'No hay propiedades en el inventario' : 'Ninguna propiedad coincide con la búsqueda'}
          </p>
        )}
        {!loading && !error && visible.map((item) => {
          const selected = selectedKeys.has(item.id)
          const busy = busyId === item.id
          const subtitle = [item.producto, item.zona_corredor, item.municipio, item.operacion, precioListado(item)]
            .filter(Boolean)
            .join(' · ')
          return (
            <button
              key={item.id}
              onClick={() => handleToggle(item)}
              disabled={busy}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] text-left transition-colors cursor-pointer disabled:cursor-wait
                ${selected ? 'bg-orange/10 border border-orange/20' : 'hover:bg-bg-tertiary border border-transparent'}`}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                ${selected ? 'bg-orange border-orange' : 'border-border-primary'}`}>
                {busy
                  ? <Loader2 className="w-3 h-3 animate-spin text-orange" strokeWidth={2} />
                  : selected && <Check className="w-3 h-3 text-white" strokeWidth={2} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {item.parque ?? 'Sin parque'}{item.unidad ? ` · Unidad ${item.unidad}` : ''}
                </p>
                <p className="text-xs text-text-tertiary truncate">{subtitle}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
