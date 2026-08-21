'use client'

import type { KeyboardEvent } from 'react'
import { Building2, KeyRound } from 'lucide-react'
import type { CartaOperacion } from '@/types/carta-propuesta'

interface OperacionToggleProps {
  value: CartaOperacion
  onChange: (value: CartaOperacion) => void
}

const OPTIONS: Array<{
  value: CartaOperacion
  label: string
  description: string
  Icon: typeof Building2
}> = [
  { value: 'compra', label: 'Compra', description: 'Propuesta de compraventa', Icon: Building2 },
  { value: 'renta', label: 'Renta', description: 'Propuesta de arrendamiento', Icon: KeyRound },
]

/** Selector Compra / Renta: control segmentado con semántica de radio (flechas para cambiar). */
export function OperacionToggle({ value, onChange }: OperacionToggleProps) {
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      onChange(value === 'compra' ? 'renta' : 'compra')
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tipo de operación"
      onKeyDown={handleKey}
      className="grid grid-cols-2 gap-1 p-1 rounded-[var(--radius-lg)] bg-bg-tertiary border border-border-primary max-w-md"
    >
      {OPTIONS.map(({ value: option, label, description, Icon }) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option)}
            className={`flex items-center gap-3 px-4 py-3 rounded-[calc(var(--radius-lg)-4px)] text-left transition-all cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-orange
              ${active
                ? 'bg-card-bg text-text-primary shadow-md ring-1 ring-orange/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/60'}`}
          >
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-colors ${
                active ? 'bg-orange text-white' : 'bg-bg-secondary text-text-tertiary'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-[11px] text-text-tertiary truncate">{description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
