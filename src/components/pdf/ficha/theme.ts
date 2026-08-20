// Sistema de marca BRIKA para documentos PDF.
// Referencia visual: public/pdf/pdf-ficha-tecnica.pdf

export const INK = '#1A1A1A'
export const GRAY = '#6B6B6B'
export const GRAY_LIGHT = '#9A9A9A'
export const PURPLE = '#A41BDD'
export const PURPLE_DARK = '#7A14A8'
export const PURPLE_SOFT = '#E4B8FF'
export const DIVIDER = '#E4E1E8'
export const BG_SOFT = '#FAFAFB'
export const WHITE = '#FFFFFF'

export const TAGLINE_L1 = 'CONSULTORÍA EN INVERSIONES'
export const TAGLINE_L2 = 'INMOBILIARIAS INDUSTRIALES'
export const TAGLINE_FULL = 'CONSULTORÍA EN INVERSIONES INMOBILIARIAS'
export const CONTACT_EMAIL = 'contacto@brika.com.mx'
export const CONTACT_PHONE = '443 207 5122'
export const LEGAL =
  'Información proporcionada con fines comerciales y sujeta a cambios y disponibilidad sin previo aviso.'

// Página carta en mm
export const PAGE_W = 215.9
export const PAGE_H = 279.4
export const MARGIN = 16

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(n)
}

// Montos siempre como $X,XXX; la moneda (MXN/USD) se anota aparte.
export function fmtMoney(n: number): string {
  return '$' + new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n)
}

// Precios por m² conservan centavos ($2.20 / m²)
export function fmtMoneyDec(n: number): string {
  const decimals = n % 1 === 0 ? 0 : 2
  return '$' + new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}
