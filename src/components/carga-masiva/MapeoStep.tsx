'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Wand2 } from 'lucide-react'
import { INVENTARIO_COLUMNS } from './columns'
import type { ParsedFile } from './parseFile'

interface MapeoStepProps {
  parsed: ParsedFile
  initialMap: Record<string, string>
  onBack: () => void
  onContinue: (map: Record<string, string>) => void
}

const NO_IMPORTAR = ''

export function MapeoStep({ parsed, initialMap, onBack, onContinue }: MapeoStepProps) {
  const [map, setMap] = useState<Record<string, string>>(initialMap)

  const samples = useMemo(() => {
    const out = new Map<string, string>()
    for (const h of parsed.headers) {
      const vals: string[] = []
      for (const r of parsed.rows) {
        const v = r.cells[h]
        if (v) vals.push(v)
        if (vals.length === 2) break
      }
      out.set(h, vals.join(' · '))
    }
    return out
  }, [parsed])

  const usedHeaders = new Set(Object.values(map).filter(Boolean))
  const unusedHeaders = parsed.headers.filter((h) => !usedHeaders.has(h))
  const missingRequired = INVENTARIO_COLUMNS.filter((c) => c.required && !map[c.dbColumn])
  const mappedCount = Object.values(map).filter(Boolean).length

  const setField = (dbColumn: string, header: string) => {
    setMap((prev) => {
      const next = { ...prev }
      // Un encabezado del archivo solo puede alimentar un campo
      if (header) {
        for (const [k, v] of Object.entries(next)) {
          if (v === header && k !== dbColumn) next[k] = NO_IMPORTAR
        }
      }
      next[dbColumn] = header
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="brika-card p-4 flex items-center gap-3 flex-wrap">
        <Wand2 className="w-4 h-4 text-orange" strokeWidth={1.5} />
        <p className="text-sm text-text-secondary">
          Indica qué columna de tu archivo corresponde a cada campo del inventario.
          Los campos con coincidencia obvia ya vienen pre-mapeados —{' '}
          <span className="font-medium text-text-primary">{mappedCount} mapeados</span> de {INVENTARIO_COLUMNS.length}.
        </p>
      </div>

      {missingRequired.length > 0 && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-orange/10 border border-orange/20">
          <p className="text-sm text-orange font-medium">
            Faltan campos obligatorios por mapear: {missingRequired.map((c) => c.header).join(', ')}
          </p>
        </div>
      )}

      <div className="brika-card p-0 overflow-hidden">
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-border-primary">
          {INVENTARIO_COLUMNS.map((c) => {
            const selected = map[c.dbColumn] ?? NO_IMPORTAR
            return (
              <div key={c.dbColumn} className="grid grid-cols-1 sm:grid-cols-[220px_1fr_1fr] gap-2 items-center px-4 py-2.5">
                <div className="text-sm text-text-primary font-medium">
                  {c.header}
                  {c.required && <span className="text-orange"> *</span>}
                </div>
                <select
                  value={selected}
                  onChange={(e) => setField(c.dbColumn, e.target.value)}
                  className={`brika-input cursor-pointer ${!selected && c.required ? 'border-orange' : ''}`}
                  style={{ height: '34px', fontSize: '13px' }}
                >
                  <option value={NO_IMPORTAR}>— No importar —</option>
                  {parsed.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <p className="text-xs text-text-tertiary truncate hidden sm:block">
                  {selected ? samples.get(selected) || 'sin datos' : ''}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {unusedHeaders.length > 0 && (
        <p className="text-xs text-text-tertiary">
          Columnas del archivo que no se importarán: {unusedHeaders.join(', ')}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border-primary">
        <button onClick={onBack} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Subir otro archivo
        </button>
        <button
          onClick={() => onContinue(map)}
          disabled={missingRequired.length > 0}
          className="brika-btn-primary"
          style={{ padding: '8px 20px', fontSize: '13px' }}
        >
          Continuar a revisión <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
