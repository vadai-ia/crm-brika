import type { CartaFormState, CartaProperty } from '@/types/carta-propuesta'
import { inmuebleFromProducto, type CartaPropuestaData } from './cartaContent'
import { toNumber } from './numeric'

// Lógica del formulario de Carta Propuesta (sin JSX): estado inicial,
// prellenado desde la propiedad y armado del payload para PDF/Word.
// (Nombre distinto de CartaForm.tsx: Windows no distingue mayúsculas en rutas.)

const TEXT_KEYS = ['nombreCliente', 'nombrePropietario', 'direccion', 'parque', 'unidad'] as const
const NUMERIC_KEYS = [
  'valorInversion', 'apartado', 'enganche', 'pctEnganche',
  'mensualidades', 'montoMensualidades', 'pagoEscritura',
] as const

export function makeEmptyForm(asesorName: string): CartaFormState {
  return {
    selectedProperty: null,
    nombreAsesor: asesorName,
    nombreCliente: '',
    nombrePropietario: '',
    direccion: '',
    parque: '',
    unidad: '',
    valorInversion: '',
    apartado: '',
    enganche: '',
    pctEnganche: '',
    mensualidades: '',
    montoMensualidades: '',
    pagoEscritura: '',
  }
}

export function hasAnyData(f: CartaFormState, defaultAsesorName: string): boolean {
  if (f.selectedProperty !== null) return true
  if (f.nombreAsesor !== '' && f.nombreAsesor !== defaultAsesorName) return true
  return [...TEXT_KEYS, ...NUMERIC_KEYS].some((k) => f[k] !== '')
}

export function isUrl(s: string | null | undefined): boolean {
  return /^https?:\/\//i.test((s ?? '').trim())
}

/** Prellena parque/unidad/dirección/valor desde el inventario. La ubicación suele ser un link de Maps: no sirve como dirección. */
export function prefillFromProperty(prev: CartaFormState, p: CartaProperty): CartaFormState {
  const venta = p.precio_total_venta ?? 0
  return {
    ...prev,
    selectedProperty: p,
    parque: p.parque ?? '',
    unidad: p.unidad ?? '',
    direccion: p.ubicacion && !isUrl(p.ubicacion) ? p.ubicacion : '',
    valorInversion: venta > 0 ? String(venta) : '',
  }
}

/** Solo propiedad, asesor y cliente son obligatorios; el resto se omite en la carta si va vacío. */
export function canGenerateCarta(f: CartaFormState): boolean {
  return f.selectedProperty !== null && f.nombreAsesor.trim() !== '' && f.nombreCliente.trim() !== ''
}

export function buildCartaData(f: CartaFormState): CartaPropuestaData {
  const p = f.selectedProperty
  return {
    nombre_asesor: f.nombreAsesor.trim(),
    nombre_cliente: f.nombreCliente.trim(),
    nombre_propietario: f.nombrePropietario.trim(),
    parque: f.parque.trim(),
    unidad: f.unidad.trim(),
    direccion: f.direccion.trim(),
    municipio: p?.municipio ?? '',
    estado: p?.estado ?? '',
    tipo_inmueble: inmuebleFromProducto(p?.producto, p?.tipo_producto),
    valor_inversion: toNumber(f.valorInversion),
    cantidad_apartado: toNumber(f.apartado),
    enganche: toNumber(f.enganche),
    pct_enganche: toNumber(f.pctEnganche),
    mensualidades: toNumber(f.mensualidades),
    monto_mensualidades: toNumber(f.montoMensualidades),
    pago_escritura: toNumber(f.pagoEscritura),
  }
}

export function cartaFileName(nombreCliente: string, ext: 'pdf' | 'docx'): string {
  const safeName = nombreCliente.trim().replace(/[^a-zA-Z0-9]+/g, '_') || 'Cliente'
  const d = new Date()
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `BRIKA_Carta_Propuesta_${safeName}_${dateStr}.${ext}`
}
