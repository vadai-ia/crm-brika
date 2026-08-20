'use client'

import { useCallback, useEffect, useState } from 'react'
import { Inbox, Loader2, Search, X } from 'lucide-react'

export interface LeadColumn<T> {
  key: string
  label: string
  render: (row: T) => React.ReactNode
}

interface LeadRow {
  id: number
  created_at: string
}

interface LeadsTableProps<T extends LeadRow> {
  endpoint: string
  columns: LeadColumn<T>[]
  emptyMessage: string
  searchPlaceholder: string
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function LeadsTable<T extends LeadRow>({
  endpoint,
  columns,
  emptyMessage,
  searchPlaceholder,
}: LeadsTableProps<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(endpoint)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar leads')
      setRows(json.data ?? [])
      setNextCursor(json.nextCursor ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar leads')
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    load()
  }, [load])

  const loadMore = async () => {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const res = await fetch(`${endpoint}?before=${encodeURIComponent(nextCursor)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al cargar más')
      setRows((prev) => [...prev, ...(json.data ?? [])])
      setNextCursor(json.nextCursor ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar más')
    } finally {
      setLoadingMore(false)
    }
  }

  const q = normalize(query)
  const visibles = q
    ? rows.filter((row) => Object.values(row).map(normalize).join(' ').includes(q))
    : rows

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
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

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-text-tertiary">
          <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
          <span className="text-sm">Cargando leads...</span>
        </div>
      )}

      {!loading && error && (
        <div className="brika-card p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={load} className="brika-btn-secondary mt-3" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && visibles.length === 0 && (
        <div className="brika-card p-10 flex flex-col items-center text-center">
          <Inbox className="w-8 h-8 text-text-tertiary mb-3" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">
            {q ? 'No hay leads que coincidan con tu búsqueda' : emptyMessage}
          </p>
          {q && (
            <p className="text-xs text-text-tertiary mt-1">Prueba con otra palabra o limpia la búsqueda</p>
          )}
        </div>
      )}

      {!loading && !error && visibles.length > 0 && (
        <>
          <div className="brika-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="brika-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((row) => (
                    <tr key={row.id}>
                      {columns.map((col) => (
                        <td key={col.key}>{col.render(row)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {nextCursor && !q && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="brika-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {loadingMore ? 'Cargando...' : 'Mostrar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
