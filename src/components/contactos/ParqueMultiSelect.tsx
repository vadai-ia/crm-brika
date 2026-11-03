'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

interface ParqueMultiSelectProps {
  /** Parques disponibles con su número de contactos */
  options: { value: string; count: number }[]
  selected: string[]
  onChange: (next: string[]) => void
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function ParqueMultiSelect({ options, selected, onChange }: ParqueMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Cierra al hacer clic fuera o con Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const visibles = useMemo(() => {
    const q = normalize(query)
    return q ? options.filter((o) => normalize(o.value).includes(q)) : options
  }, [options, query])

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const label =
    selected.length === 0 ? 'Todos los parques'
      : selected.length === 1 ? selected[0]
        : `${selected.length} parques`

  return (
    <div ref={ref} className="relative w-full sm:w-60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`h-10 w-full flex items-center gap-2 px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border
          transition-colors cursor-pointer ${selected.length > 0 ? 'border-orange/50 text-text-primary' : 'border-input-border text-text-secondary'}`}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        {selected.length > 1 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange text-white text-[11px] font-semibold flex items-center justify-center">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full sm:w-72 brika-modal-solid rounded-[12px] border border-border-primary shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border-primary">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" strokeWidth={1.5} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar parque..."
                className="w-full h-8 pl-8 pr-2 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
                  text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring"
              />
            </div>
          </div>

          <ul className="max-h-72 overflow-y-auto py-1" role="listbox" aria-multiselectable>
            {visibles.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-text-tertiary">Sin coincidencias</li>
            )}
            {visibles.map((o) => {
              const active = selected.includes(o.value)
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => toggle(o.value)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-text-primary
                      hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 flex-shrink-0 rounded-[4px] border flex items-center justify-center transition-colors ${
                        active ? 'bg-orange border-orange' : 'border-input-border'
                      }`}
                    >
                      {active && <Check className="w-3 h-3 text-white" strokeWidth={2.5} />}
                    </span>
                    <span className="flex-1 truncate">{o.value}</span>
                    <span className="text-xs text-text-tertiary tabular-nums">{o.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border-primary">
              <span className="text-xs text-text-tertiary">{selected.length} seleccionado{selected.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-orange hover:underline cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
