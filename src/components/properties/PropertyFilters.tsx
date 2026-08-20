'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal, X, Search } from 'lucide-react'
import type { ColumnVisibility } from '@/types'
import type { FilterValue } from '@/hooks/useFilters'
import { BODEGA_OPTIONS } from '@/lib/utils/constants'

interface FilterOptions {
  colonias: string[]
  alcaldias: string[]
  disponibilidades: string[]
  tipos_preventa: string[]
  tipos_entrega: string[]
}

interface PropertyFiltersProps {
  filterableColumns: ColumnVisibility[]
  activeFilters: Record<string, string>
  filterChips: FilterValue[]
  onSetFilter: (key: string, value: string, label?: string, displayValue?: string) => void
  onRemoveFilter: (key: string) => void
  onClearAll: () => void
}

const FILTER_OPTIONS_MAP: Record<string, keyof FilterOptions> = {
  colonia: 'colonias',
  alcaldia: 'alcaldias',
  disponibilidad: 'disponibilidades',
  tipo_preventa: 'tipos_preventa',
  tipo_entrega: 'tipos_entrega',
}

function SelectFilter({
  col,
  value,
  options,
  onChange,
}: {
  col: ColumnVisibility
  value: string
  options: string[]
  onChange: (key: string, value: string, label: string, display: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(col.column_name, e.target.value, col.display_label ?? col.column_name, e.target.value)
      }
      className="h-9 w-full px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
        text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring cursor-pointer"
    >
      <option value="">Todas</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </option>
      ))}
    </select>
  )
}

function RangeFilter({
  col,
  minValue,
  maxValue,
  onChange,
}: {
  col: ColumnVisibility
  minValue: string
  maxValue: string
  onChange: (key: string, value: string, label: string, display: string) => void
}) {
  const label = col.display_label ?? col.column_name
  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="number"
        placeholder="Min"
        value={minValue}
        onChange={(e) => {
          const val = e.target.value
          onChange(`${col.column_name}_min`, val, label, val ? `${label} >= ${val}` : '')
        }}
        className="h-9 flex-1 min-w-0 px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
          text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-text-tertiary text-xs flex-shrink-0">—</span>
      <input
        type="number"
        placeholder="Max"
        value={maxValue}
        onChange={(e) => {
          const val = e.target.value
          onChange(`${col.column_name}_max`, val, label, val ? `${label} <= ${val}` : '')
        }}
        className="h-9 flex-1 min-w-0 px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
          text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  )
}

function TextFilter({
  col,
  value,
  onChange,
}: {
  col: ColumnVisibility
  value: string
  onChange: (key: string, value: string, label: string, display: string) => void
}) {
  return (
    <input
      type="text"
      placeholder={col.display_label ?? col.column_name}
      value={value}
      onChange={(e) =>
        onChange(col.column_name, e.target.value, col.display_label ?? col.column_name, e.target.value)
      }
      className="h-9 w-full px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
        text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring"
    />
  )
}

function BooleanFilter({
  col,
  value,
  onChange,
}: {
  col: ColumnVisibility
  value: string
  onChange: (key: string, value: string, label: string, display: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(col.column_name, e.target.value, col.display_label ?? col.column_name, e.target.value)
      }
      className="h-9 px-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
        text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring
        w-full cursor-pointer"
    >
      <option value="">Todos</option>
      <option value="Si">Sí</option>
      <option value="No">No</option>
    </select>
  )
}

function FilterInput({
  col,
  activeFilters,
  selectOptions,
  onChange,
}: {
  col: ColumnVisibility
  activeFilters: Record<string, string>
  selectOptions: string[]
  onChange: (key: string, value: string, label: string, display: string) => void
}) {
  switch (col.filter_type) {
    case 'select':
      return (
        <SelectFilter
          col={col}
          value={activeFilters[col.column_name] ?? ''}
          options={selectOptions}
          onChange={onChange}
        />
      )
    case 'range':
      return (
        <RangeFilter
          col={col}
          minValue={activeFilters[`${col.column_name}_min`] ?? ''}
          maxValue={activeFilters[`${col.column_name}_max`] ?? ''}
          onChange={onChange}
        />
      )
    case 'text':
      return (
        <TextFilter
          col={col}
          value={activeFilters[col.column_name] ?? ''}
          onChange={onChange}
        />
      )
    case 'boolean':
      return (
        <BooleanFilter
          col={col}
          value={activeFilters[col.column_name] ?? ''}
          onChange={onChange}
        />
      )
    default:
      return null
  }
}

function LabeledFilter({
  col,
  activeFilters,
  selectOptions,
  onChange,
}: {
  col: ColumnVisibility
  activeFilters: Record<string, string>
  selectOptions: string[]
  onChange: (key: string, value: string, label: string, display: string) => void
}) {
  return (
    <div>
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
        {col.display_label ?? col.column_name}
      </label>
      <FilterInput
        col={col}
        activeFilters={activeFilters}
        selectOptions={selectOptions}
        onChange={onChange}
      />
    </div>
  )
}

export function PropertyFilters({
  filterableColumns,
  activeFilters,
  filterChips,
  onSetFilter,
  onRemoveFilter,
  onClearAll,
}: PropertyFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedDesktop, setExpandedDesktop] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const hasFilters = filterChips.length > 0

  useEffect(() => {
    fetch('/api/properties/filter-options')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setFilterOptions(data) })
      .catch(() => {})
  }, [])

  const getSelectOptions = (columnName: string): string[] => {
    if (columnName === 'bodega') return [...BODEGA_OPTIONS]
    const key = FILTER_OPTIONS_MAP[columnName]
    if (key && filterOptions) return filterOptions[key]
    return []
  }

  const structuredColumns = filterableColumns.filter((c) => c.filter_type !== 'text')
  const DEFAULT_FILTERS = ['precio_unidad', 'colonia', 'm2_totales']
  const essentialColumns = DEFAULT_FILTERS
    .map((name) => structuredColumns.find((c) => c.column_name === name))
    .filter((c): c is NonNullable<typeof c> => !!c)
  const essentialSet = new Set(essentialColumns.map((c) => c.column_name))
  const extraColumns = structuredColumns.filter((c) => !essentialSet.has(c.column_name))

  const filterContent = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Global search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Buscar..."
          value={activeFilters.search ?? ''}
          onChange={(e) => onSetFilter('search', e.target.value, 'Búsqueda', e.target.value)}
          className="h-9 pl-9 pr-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
            text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring
            w-[200px]"
        />
      </div>

      {structuredColumns.map((col) => (
        <FilterInput
          key={col.id}
          col={col}
          activeFilters={activeFilters}
          selectOptions={getSelectOptions(col.column_name)}
          onChange={onSetFilter}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-3">
      {/* Desktop filters — search full width + 3 defaults + expandable more */}
      <div className="hidden lg:block space-y-3">
        {/* Row 1: Full-width search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar por parque, zona, municipio, ubicación..."
            value={activeFilters.search ?? ''}
            onChange={(e) => onSetFilter('search', e.target.value, 'Búsqueda', e.target.value)}
            className="h-10 w-full pl-9 pr-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
              text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring"
          />
        </div>

        {/* Row 2: 3 default filters */}
        <div className="grid grid-cols-3 gap-3">
          {essentialColumns.map((col) => (
            <LabeledFilter
              key={col.id}
              col={col}
              activeFilters={activeFilters}
              selectOptions={getSelectOptions(col.column_name)}
              onChange={onSetFilter}
            />
          ))}
        </div>

        {/* Row 3: More filters button */}
        {extraColumns.length > 0 && (
          <div>
            <button
              onClick={() => setExpandedDesktop(!expandedDesktop)}
              className={`flex items-center gap-2 h-9 px-3 text-sm font-medium rounded-[var(--radius-sm)] border transition-colors cursor-pointer
                ${expandedDesktop ? 'border-orange text-orange bg-orange/5' : 'border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'}`}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
              {expandedDesktop ? 'Menos filtros' : 'Más filtros'}
            </button>

            {expandedDesktop && (
              <div className="brika-filter-panel mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-4">
                  {extraColumns.map((col) => (
                    <LabeledFilter
                      key={col.id}
                      col={col}
                      activeFilters={activeFilters}
                      selectOptions={getSelectOptions(col.column_name)}
                      onChange={onSetFilter}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile filter button + drawer */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
            bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          Filtros
          {hasFilters && (
            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-orange rounded-full">
              {filterChips.length}
            </span>
          )}
        </button>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border-primary rounded-t-[20px] p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary">
                  Filtros
                </h3>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-bg-tertiary cursor-pointer"
                >
                  <X className="w-4 h-4 text-text-secondary" strokeWidth={1.5} />
                </button>
              </div>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={activeFilters.search ?? ''}
                    onChange={(e) => onSetFilter('search', e.target.value, 'Búsqueda', e.target.value)}
                    className="h-10 w-full pl-9 pr-3 text-sm rounded-[var(--radius-sm)] bg-input-bg border border-input-border
                      text-text-primary focus:outline-none focus:ring-2 focus:ring-input-focus-ring"
                  />
                </div>
                {structuredColumns.map((col) => (
                  <div key={col.id}>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      {col.display_label ?? col.column_name}
                    </label>
                    <FilterInput
                      col={col}
                      activeFilters={activeFilters}
                      selectOptions={getSelectOptions(col.column_name)}
                      onChange={onSetFilter}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                {hasFilters && (
                  <button
                    onClick={onClearAll}
                    className="flex-1 h-10 text-sm font-medium rounded-[var(--radius-sm)] border border-border-primary
                      text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 h-10 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white
                    hover:bg-orange-hover transition-colors cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filterChips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
                bg-orange/10 text-orange border border-orange/20"
            >
              {chip.label}: {chip.displayValue}
              <button
                onClick={() => onRemoveFilter(chip.key)}
                className="hover:text-orange-hover cursor-pointer"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </span>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs font-medium text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}
