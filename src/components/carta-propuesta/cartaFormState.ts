import type { CartaFormState, CartaOperacion, CartaProperty, CartaPropertyDetail } from '@/types/carta-propuesta'
import { inmuebleFromProducto, nombreInmueble, fmtM2, type CartaPropuestaData } from './cartaContent'
import { toNumber } from './numeric'

// Lógica del formulario de Carta Propuesta (sin JSX): estado inicial,
// prellenado desde la propiedad y armado del payload para PDF/Word.
// (Nombre distinto de CartaForm.tsx: Windows no distingue mayúsculas en rutas.)

export const DEFAULTS = {
  ciudadExpedicion: 'Querétaro',
  estadoExpedicion: 'Querétaro',
  cargoAsesor: 'Asesor Comercial',
  incrementoAnual: 'INPC',
  vigenciaDias: '15',
  fechaInicio: 'A definir tras aceptación',
} as const

const TEXT_KEYS = [
  'destinatarioNombre', 'destinatarioCargo', 'destinatarioEmpresa', 'nombreCliente',
  'inmuebleDescripcion', 'superficie', 'parque', 'unidad',
  'rentaMensual', 'plazoAnios', 'depositoMeses', 'precioCompra', 'formaPago', 'enganchePct',
  'condicionesEspeciales',
] as const

export function makeEmptyForm(asesorName: string): CartaFormState {
  return {
    selectedProperty: null,
    propertyDetail: null,
    operacion: 'compra',
    ciudadExpedicion: DEFAULTS.ciudadExpedicion,
    estadoExpedicion: DEFAULTS.estadoExpedicion,
    destinatarioNombre: '',
    destinatarioCargo: '',
    destinatarioEmpresa: '',
    nombreCliente: '',
    inmuebleDescripcion: '',
    superficie: '',
    parque: '',
    unidad: '',
    rentaMensual: '',
    rentaMasIva: true,
    plazoAnios: '',
    depositoMeses: '',
    incrementoAnual: DEFAULTS.incrementoAnual,
    precioCompra: '',
    formaPago: '',
    enganchePct: '',
    fechaInicio: DEFAULTS.fechaInicio,
    condicionesEspeciales: '',
    vigenciaDias: DEFAULTS.vigenciaDias,
    nombreAsesor: asesorName,
    cargoAsesor: DEFAULTS.cargoAsesor,
  }
}

export function hasAnyData(f: CartaFormState, defaultAsesorName: string): boolean {
  if (f.selectedProperty !== null) return true
  if (f.nombreAsesor !== '' && f.nombreAsesor !== defaultAsesorName) return true
  return TEXT_KEYS.some((k) => f[k] !== '')
}

export function isUrl(s: string | null | undefined): boolean {
  return /^https?:\/\//i.test((s ?? '').trim())
}

/** "Renta" / "Arrendamiento" en el inventario → renta; Venta / Preventa / BTS / vacío → compra. */
export function operacionFromInventario(operacion: string | null | undefined): CartaOperacion {
  return /rent|arrend/i.test(operacion ?? '') ? 'renta' : 'compra'
}

/**
 * Superficie del inmueble según el inventario: la que indique `area_base_calculo`
 * si se reconoce; si no, lotes → terreno y naves → rentable > construcción > terreno.
 */
export function superficieFromDetail(tipo: string, d: CartaPropertyDetail | null): number | null {
  if (!d) return null
  const base = (d.area_base_calculo ?? '').toLowerCase()
  if (base.includes('terreno') && d.m2_terreno) return d.m2_terreno
  if (base.includes('construc') && d.m2_construccion) return d.m2_construccion
  if (base.includes('rentab') && d.m2_rentables) return d.m2_rentables
  if (tipo.startsWith('lote')) return d.m2_terreno ?? d.m2_rentables ?? d.m2_construccion
  return d.m2_rentables ?? d.m2_construccion ?? d.m2_terreno
}

/**
 * Prellena desde el inventario: operación, parque/unidad, empresa destinataria
 * (el parque), descripción del inmueble, superficie y precio (renta o venta).
 * `detail` llega de GET /api/properties/[id]; si falta, se prellena lo básico.
 */
export function prefillFromProperty(prev: CartaFormState, p: CartaProperty, detail: CartaPropertyDetail | null): CartaFormState {
  const tipo = inmuebleFromProducto(p.producto, p.tipo_producto)
  const superficie = superficieFromDetail(tipo, detail)
  const venta = detail?.precio_total_venta ?? p.precio_total_venta ?? 0
  const renta = detail?.renta_mensual ?? p.renta_mensual ?? 0
  const where = [...new Set([p.municipio, p.estado].filter(Boolean))].join(', ')
  const nombre = nombreInmueble({ tipo_inmueble: tipo, unidad: p.unidad ?? '', parque: p.parque ?? '' })
  const descripcion = [nombre, superficie ? fmtM2(superficie) : '', where].filter(Boolean).join(' — ')
  const entrega = (detail?.fecha_entrega ?? '').trim()

  return {
    ...prev,
    selectedProperty: p,
    propertyDetail: detail,
    operacion: operacionFromInventario(p.operacion),
    destinatarioEmpresa: prev.destinatarioEmpresa || (p.parque ?? ''),
    parque: p.parque ?? '',
    unidad: p.unidad ?? '',
    inmuebleDescripcion: descripcion,
    superficie: superficie ? String(superficie) : '',
    precioCompra: venta > 0 ? String(venta) : '',
    rentaMensual: renta > 0 ? String(renta) : '',
    fechaInicio: entrega && !/^disponible$/i.test(entrega) ? `Disponibilidad: ${entrega}` : prev.fechaInicio,
  }
}

/** Solo propiedad, asesor y cliente son obligatorios; el resto se omite en la carta si va vacío. */
export function canGenerateCarta(f: CartaFormState): boolean {
  return f.selectedProperty !== null && f.nombreAsesor.trim() !== '' && f.nombreCliente.trim() !== ''
}

export function buildCartaData(f: CartaFormState): CartaPropuestaData {
  const p = f.selectedProperty
  return {
    operacion: f.operacion,
    ciudad_expedicion: f.ciudadExpedicion.trim(),
    estado_expedicion: f.estadoExpedicion.trim(),
    destinatario_nombre: f.destinatarioNombre.trim(),
    destinatario_cargo: f.destinatarioCargo.trim(),
    destinatario_empresa: f.destinatarioEmpresa.trim(),
    nombre_cliente: f.nombreCliente.trim(),
    tipo_inmueble: inmuebleFromProducto(p?.producto, p?.tipo_producto),
    inmueble_descripcion: f.inmuebleDescripcion.trim(),
    superficie_m2: toNumber(f.superficie),
    parque: f.parque.trim(),
    unidad: f.unidad.trim(),
    municipio: p?.municipio ?? '',
    estado: p?.estado ?? '',
    renta_mensual: toNumber(f.rentaMensual),
    renta_mas_iva: f.rentaMasIva,
    plazo_anios: toNumber(f.plazoAnios),
    deposito_meses: toNumber(f.depositoMeses),
    incremento_anual: f.incrementoAnual.trim(),
    precio_compra: toNumber(f.precioCompra),
    forma_pago: f.formaPago.trim(),
    enganche_pct: toNumber(f.enganchePct),
    fecha_inicio: f.fechaInicio.trim(),
    condiciones_especiales: f.condicionesEspeciales.trim(),
    vigencia_dias: toNumber(f.vigenciaDias),
    nombre_asesor: f.nombreAsesor.trim(),
    cargo_asesor: f.cargoAsesor.trim(),
  }
}

export function cartaFileName(nombreCliente: string, ext: 'pdf' | 'docx'): string {
  const safeName = nombreCliente.trim().replace(/[^a-zA-Z0-9]+/g, '_') || 'Cliente'
  const d = new Date()
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `BRIKA_Carta_Propuesta_${safeName}_${dateStr}.${ext}`
}
