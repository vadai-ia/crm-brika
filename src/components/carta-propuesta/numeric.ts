// Helpers para inputs numéricos controlados (montos y porcentajes).

/** Deja solo dígitos y un único punto decimal. */
export function sanitizeNumeric(s: string): string {
  let cleaned = s.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
  }
  return cleaned
}

/** "5758150.50" → "5,758,150.50" conservando los decimales tecleados. */
export function formatNumericDisplay(raw: string): string {
  if (!raw) return ''
  const [intPart, fracPart] = raw.split('.')
  const n = parseInt(intPart || '0', 10)
  if (isNaN(n)) return raw
  const formattedInt = new Intl.NumberFormat('es-MX').format(n)
  return fracPart !== undefined ? `${formattedInt}.${fracPart}` : formattedInt
}

export function toNumber(raw: string): number {
  const n = parseFloat(raw)
  return isNaN(n) ? 0 : n
}
