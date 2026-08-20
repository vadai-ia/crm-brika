'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal, Search } from 'lucide-react'

interface FilterOptions {
  colonias: string[]
  alcaldias: string[]
  disponibilidades: string[]
  tipos_preventa: string[]
  tipos_entrega: string[]
}

interface DesarrolloFiltersProps {
  activeFilters: Record<string, string>
  onSetFilter: (key: string, value: string) => void
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block mb-1"
      style={{
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </label>
  )
}

function RangeInput({
  minKey,
  maxKey,
  activeFilters,
  onSetFilter,
}: {
  minKey: string
  maxKey: string
  activeFilters: Record<string, string>
  onSetFilter: (key: string, value: string) => void
}) {
  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="number"
        placeholder="Min"
        value={activeFilters[minKey] ?? ''}
        onChange={(e) => onSetFilter(minKey, e.target.value)}
        className="h-9 flex-1 min-w-0 px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-text-tertiary text-xs flex-shrink-0">—</span>
      <input
        type="number"
        placeholder="Max"
        value={activeFilters[maxKey] ?? ''}
        onChange={(e) => onSetFilter(maxKey, e.target.value)}
        className="h-9 flex-1 min-w-0 px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  )
}

function SelectInput({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string
  placeholder: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </option>
      ))}
    </select>
  )
}

export function DesarrolloFilters({ activeFilters, onSetFilter }: DesarrolloFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  const [options, setOptions] = useState<FilterOptions | null>(null)

  useEffect(() => {
    fetch('/api/desarrollos/filter-options')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setOptions(data) })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-3">
      {/* Row 1: Full-width search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Buscar por nombre, colonia, dirección..."
          value={activeFilters.search ?? ''}
          onChange={(e) => onSetFilter('search', e.target.value)}
          className="h-10 w-full pl-9 pr-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring"
        />
      </div>

      {/* Row 2: Default filters (3) */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Precio</Label>
          <RangeInput minKey="precio_min" maxKey="precio_max" activeFilters={activeFilters} onSetFilter={onSetFilter} />
        </div>
        <div>
          <Label>Colonia</Label>
          <SelectInput
            value={activeFilters.colonia ?? ''}
            placeholder="Todas"
            options={options?.colonias ?? []}
            onChange={(v) => onSetFilter('colonia', v)}
          />
        </div>
        <div>
          <Label>M² Totales</Label>
          <RangeInput minKey="m2_totales_min" maxKey="m2_totales_max" activeFilters={activeFilters} onSetFilter={onSetFilter} />
        </div>
      </div>

      {/* More filters toggle */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-[var(--radius-sm)] border transition-colors cursor-pointer
            ${expanded ? 'border-orange text-orange bg-orange/5' : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          {expanded ? 'Menos filtros' : 'Más filtros'}
        </button>

        {expanded && (
          <div className="brika-filter-panel mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-4">
              <div>
                <Label>Disponibilidad</Label>
                <SelectInput
                  value={activeFilters.disponibilidad ?? ''}
                  placeholder="Todas"
                  options={options?.disponibilidades ?? []}
                  onChange={(v) => onSetFilter('disponibilidad', v)}
                />
              </div>
              <div>
                <Label>Alcaldía</Label>
                <SelectInput
                  value={activeFilters.alcaldia ?? ''}
                  placeholder="Todas"
                  options={options?.alcaldias ?? []}
                  onChange={(v) => onSetFilter('alcaldia', v)}
                />
              </div>
              <div>
                <Label>Tipo Preventa</Label>
                <SelectInput
                  value={activeFilters.tipo_preventa ?? ''}
                  placeholder="Todos"
                  options={options?.tipos_preventa ?? []}
                  onChange={(v) => onSetFilter('tipo_preventa', v)}
                />
              </div>
              <div>
                <Label>Tipo Entrega</Label>
                <SelectInput
                  value={activeFilters.tipo_entrega ?? ''}
                  placeholder="Todos"
                  options={options?.tipos_entrega ?? []}
                  onChange={(v) => onSetFilter('tipo_entrega', v)}
                />
              </div>
              <div>
                <Label>Recámaras</Label>
                <RangeInput minKey="recamaras_min" maxKey="recamaras_max" activeFilters={activeFilters} onSetFilter={onSetFilter} />
              </div>
              <div>
                <Label>Baños</Label>
                <RangeInput minKey="banos_min" maxKey="banos_max" activeFilters={activeFilters} onSetFilter={onSetFilter} />
              </div>
              <div>
                <Label>Estacionamientos</Label>
                <RangeInput minKey="estacionamientos_min" maxKey="estacionamientos_max" activeFilters={activeFilters} onSetFilter={onSetFilter} />
              </div>
              <div>
                <Label>Bodega</Label>
                <SelectInput
                  value={activeFilters.bodega ?? ''}
                  placeholder="Todas"
                  options={['Si', 'No']}
                  onChange={(v) => onSetFilter('bodega', v)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
