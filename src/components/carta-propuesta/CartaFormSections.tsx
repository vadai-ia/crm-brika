'use client'

import type { ReactNode } from 'react'
import { formatNumericDisplay, sanitizeNumeric } from './numeric'

// Piezas del formulario de Carta Propuesta (sin lógica de negocio).

export const OPTIONAL_HINT = 'Los campos vacíos o en 0 no aparecen en la carta.'

export function SectionTitle({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">{title}{children}</h2>
      {hint && <p className="text-xs text-text-tertiary mt-0.5">{hint}</p>}
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  hint?: string
}

export function TextField({ label, value, onChange, placeholder, required, hint }: TextFieldProps) {
  return (
    <div>
      <label className="brika-label">{label}{required ? ' *' : ''}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="brika-input" />
      {hint && <p className="text-[11px] text-text-tertiary mt-1">{hint}</p>}
    </div>
  )
}

export function TextArea({ label, value, onChange, placeholder, hint, rows = 3 }: TextFieldProps & { rows?: number }) {
  return (
    <div className="md:col-span-2">
      <label className="brika-label">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="brika-input resize-y"
        style={{ height: 'auto', minHeight: `${rows * 1.6 + 1}rem`, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
      />
      {hint && <p className="text-[11px] text-text-tertiary mt-1">{hint}</p>}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  focusedKey: string | null
  setFocusedKey: (k: string | null) => void
  hint?: string
  suffix?: string
}

/** Input numérico: muestra separadores de miles al perder el foco, crudo al editar. */
export function NumberField({ label, id, value, onChange, focusedKey, setFocusedKey, hint, suffix }: NumberFieldProps) {
  const focused = focusedKey === id
  const display = focused ? value : formatNumericDisplay(value)
  return (
    <div>
      <label htmlFor={id} className="brika-label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={display}
          onFocus={() => setFocusedKey(id)}
          onBlur={() => setFocusedKey(null)}
          onChange={(e) => onChange(sanitizeNumeric(e.target.value))}
          placeholder="0"
          className="brika-input"
          style={suffix ? { paddingRight: '3.5rem' } : undefined}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary pointer-events-none">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[11px] text-text-tertiary mt-1">{hint}</p>}
    </div>
  )
}

export function CheckField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none pt-6">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-border-secondary accent-[var(--color-orange)] cursor-pointer"
      />
      <span>
        <span className="text-sm text-text-primary">{label}</span>
        {hint && <span className="block text-[11px] text-text-tertiary">{hint}</span>}
      </span>
    </label>
  )
}
