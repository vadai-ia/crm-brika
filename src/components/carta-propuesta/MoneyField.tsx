'use client'

import { formatNumericDisplay, sanitizeNumeric } from './numeric'

interface MoneyFieldProps {
  label: string
  id: string
  value: string
  onChange: (v: string) => void
  focusedKey: string | null
  setFocusedKey: (k: string | null) => void
  hint?: string
}

/** Input numérico: muestra separadores de miles al perder el foco, crudo al editar. */
export function MoneyField({ label, id, value, onChange, focusedKey, setFocusedKey, hint }: MoneyFieldProps) {
  const focused = focusedKey === id
  const display = focused ? value : formatNumericDisplay(value)
  return (
    <div>
      <label htmlFor={id} className="brika-label">{label}</label>
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
      />
      {hint && <p className="text-[11px] text-text-tertiary mt-1">{hint}</p>}
    </div>
  )
}
