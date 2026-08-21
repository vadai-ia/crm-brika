// Texto de la Carta Propuesta BRIKA, según la plantilla
// public/pdf/BRIKA_Plantilla_Carta_Propuesta_Ejemplo.pdf (compra o renta).
// Único lugar donde se redacta: PDF y Word solo dibujan lo que sale de aquí.
// Regla: todo campo vacío, null o 0 se omite; las filas de la tabla que no
// apliquen (renta vs. venta, o sin valor) no se imprimen.

import type { CartaOperacion } from '@/types/carta-propuesta'
import { CONTACT_EMAIL, CONTACT_PHONE, TAGLINE_L1, TAGLINE_L2 } from '@/components/pdf/ficha/theme'

export interface CartaPropuestaData {
  operacion: CartaOperacion
  ciudad_expedicion: string
  estado_expedicion: string
  destinatario_nombre: string
  destinatario_cargo: string
  destinatario_empresa: string
  nombre_cliente: string
  /** 'nave industrial' | 'lote industrial' | 'propiedad industrial' */
  tipo_inmueble: string
  inmueble_descripcion: string
  superficie_m2: number
  parque: string
  unidad: string
  municipio: string
  estado: string
  // Renta
  renta_mensual: number
  renta_mas_iva: boolean
  plazo_anios: number
  deposito_meses: number
  incremento_anual: string
  // Venta
  precio_compra: number
  forma_pago: string
  enganche_pct: number
  // Comunes
  fecha_inicio: string
  condiciones_especiales: string
  vigencia_dias: number
  // Remitente
  nombre_asesor: string
  cargo_asesor: string
}

export interface CartaRow {
  label: string
  value: string
}

export interface CartaContent {
  tagline: [string, string]
  fechaLine: string
  /** Líneas del bloque de destinatario (nombre en negrita es la primera). */
  destinatario: { nombre: string; cargo: string; empresa: string }
  presente: string
  asuntoLabel: string
  asunto: string
  saludo: string
  parrafos: string[]
  terminosTitulo: string
  rows: CartaRow[]
  disclaimer: string
  cierre: string[]
  despedida: string
  firma: { nombre: string; cargo: string; empresa: string; contacto: string }
  aceptacionTitulo: string
  aceptacionLabels: [string, string]
  footer: [string, string]
}

export const BRIKA_EMPRESA = 'BRIKA Inmobiliaria'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function cartaFecha(d: Date = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

/** "$1,234,567" o "$1,234.50" (centavos solo si existen). */
export function fmtMoney(n: number): string {
  const decimals = Number.isInteger(n) ? 0 : 2
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function fmtPct(n: number): string {
  return `${Number(n.toFixed(2))}%`
}

export function fmtM2(n: number): string {
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n)} m²`
}

const has = (n: number): boolean => Number.isFinite(n) && n > 0
const txt = (s: string | null | undefined): string => (s ?? '').trim()
const plural = (n: number, uno: string, varios: string): string => {
  const k = Math.round(n)
  return k === 1 ? `1 ${uno}` : `${k} ${varios}`
}

/** Tipo de inmueble a partir de `producto` / `tipo_producto` del inventario. */
export function inmuebleFromProducto(producto?: string | null, tipoProducto?: string | null): string {
  const p = `${producto ?? ''} ${tipoProducto ?? ''}`.toLowerCase()
  if (p.includes('lote') || p.includes('terreno')) return 'lote industrial'
  if (p.includes('nave') || p.includes('bts') || p.includes('bodega')) return 'nave industrial'
  return 'propiedad industrial'
}

/** "Nave industrial 63, Eizen 57" / "Lote industrial 7" / "Eizen 57" — nombre corto del inmueble. */
export function nombreInmueble(d: Pick<CartaPropuestaData, 'tipo_inmueble' | 'unidad' | 'parque'>): string {
  const tipo = txt(d.tipo_inmueble) || 'propiedad industrial'
  const unidad = txt(d.unidad)
  const parque = txt(d.parque)
  const tipoCap = tipo.charAt(0).toUpperCase() + tipo.slice(1)
  if (unidad && parque) return `${tipoCap} ${unidad}, ${parque}`
  if (unidad) return `${tipoCap} ${unidad}`
  return parque || tipoCap
}

function lugar(d: Pick<CartaPropuestaData, 'municipio' | 'estado'>): string {
  return [...new Set([txt(d.municipio), txt(d.estado)].filter(Boolean))].join(', ')
}

/** "la nave industrial 63 ubicada en el parque Eizen 57, El Marqués, Querétaro" */
function fraseInmueble(d: CartaPropuestaData): string {
  const tipo = txt(d.tipo_inmueble) || 'propiedad industrial'
  const art = tipo.startsWith('lote') ? 'el' : 'la'
  const unidad = txt(d.unidad)
  const parque = txt(d.parque)
  let s = `${art} ${tipo}${unidad ? ` ${unidad}` : ''}`
  if (parque) s += /^parque/i.test(parque) ? ` ubicad${art === 'el' ? 'o' : 'a'} en ${parque}` : ` ubicad${art === 'el' ? 'o' : 'a'} en el parque ${parque}`
  const where = lugar(d)
  if (where) s += `, ${where}`
  return s
}

function porM2(monto: number, superficie: number): string {
  if (!has(monto) || !has(superficie)) return ''
  const unit = monto / superficie
  const decimals = unit % 1 === 0 ? 0 : 2
  const f = new Intl.NumberFormat('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(unit)
  return ` ($${f} / m²)`
}

function buildRows(d: CartaPropuestaData): CartaRow[] {
  const renta = d.operacion === 'renta'
  const rows: CartaRow[] = []
  const push = (label: string, value: string) => {
    if (txt(value)) rows.push({ label, value: txt(value) })
  }

  push('Inmueble', d.inmueble_descripcion)
  if (has(d.superficie_m2)) push('Superficie', fmtM2(d.superficie_m2))
  push('Operación propuesta', renta ? 'Renta' : 'Compra-venta')

  if (renta) {
    if (has(d.renta_mensual)) {
      push('Renta mensual propuesta', `${fmtMoney(d.renta_mensual)} MXN${d.renta_mas_iva ? ' + IVA' : ''}${porM2(d.renta_mensual, d.superficie_m2)}`)
    }
    if (has(d.plazo_anios)) push('Plazo forzoso del contrato', plural(d.plazo_anios, 'año', 'años'))
    if (has(d.deposito_meses)) push('Depósito en garantía', `${plural(d.deposito_meses, 'mes', 'meses')} de renta`)
    push('Incremento anual', d.incremento_anual)
  } else {
    if (has(d.precio_compra)) push('Precio de compra propuesto', `${fmtMoney(d.precio_compra)} MXN${porM2(d.precio_compra, d.superficie_m2)}`)
    push('Forma de pago', d.forma_pago)
    if (has(d.enganche_pct)) {
      const monto = has(d.precio_compra) ? ` (${fmtMoney((d.precio_compra * d.enganche_pct) / 100)} MXN)` : ''
      push('Enganche', `${fmtPct(d.enganche_pct)}${monto}`)
    }
  }

  push('Fecha estimada de inicio / cierre', d.fecha_inicio)
  push('Condiciones especiales', d.condiciones_especiales)
  if (has(d.vigencia_dias)) {
    push('Vigencia de esta propuesta', `${plural(d.vigencia_dias, 'día natural', 'días naturales')} a partir de su fecha de expedición`)
  }
  return rows
}

export function buildCartaContent(d: CartaPropuestaData, hoy: Date = new Date()): CartaContent {
  const renta = d.operacion === 'renta'
  const tipo = txt(d.tipo_inmueble) || 'propiedad industrial'
  const cliente = txt(d.nombre_cliente)
  const destinatario = txt(d.destinatario_nombre)
  const expedicion = [...new Set([txt(d.ciudad_expedicion), txt(d.estado_expedicion)].filter(Boolean))].join(', ')
  const where = lugar(d)

  return {
    tagline: [TAGLINE_L1, TAGLINE_L2],
    fechaLine: `${expedicion ? `${expedicion}, ` : ''}a ${cartaFecha(hoy)}`,
    destinatario: {
      nombre: destinatario,
      cargo: txt(d.destinatario_cargo),
      empresa: txt(d.destinatario_empresa),
    },
    presente: 'Presente.',
    asuntoLabel: 'Asunto:',
    asunto: `Propuesta formal de ${renta ? 'renta' : 'compra'} de ${tipo} — ${nombreInmueble(d)}${where ? `, ${where}` : ''}`,
    saludo: destinatario ? `Estimado(a) ${destinatario}:` : 'A quien corresponda:',
    parrafos: [
      `Reciba un cordial saludo de parte de ${BRIKA_EMPRESA}. Por medio de la presente, actuamos en representación de ` +
      `${cliente || 'nuestro cliente'}, con quien hemos tenido la oportunidad de revisar ${fraseInmueble(d)}, y quien ha ` +
      `manifestado interés formal en avanzar con una propuesta de ${renta ? 'renta' : 'adquisición'} sobre dicho inmueble.`,
      'Con base en lo anterior, nos permitimos presentar a usted los términos y condiciones bajo los cuales nuestro cliente ' +
      'estaría dispuesto a formalizar la operación, mismos que quedan sujetos a la revisión, negociación y aprobación final de ambas partes:',
    ],
    terminosTitulo: 'TÉRMINOS DE LA PROPUESTA',
    rows: buildRows(d),
    disclaimer:
      'Esta propuesta es de carácter preliminar e informativo, no constituye un contrato ni una oferta vinculante, y queda sujeta ' +
      'a la revisión legal, due diligence, y aprobación interna de ambas partes, así como a la disponibilidad del inmueble al momento de su aceptación.',
    cierre: [
      'Quedamos en la mejor disposición de resolver cualquier duda y, en su caso, avanzar con la elaboración del contrato ' +
      'correspondiente. Agradecemos de antemano su atención y quedamos atentos a sus comentarios antes del vencimiento de la vigencia de esta propuesta.',
      'Sin otro particular por el momento, quedo a sus órdenes.',
    ],
    despedida: 'Atentamente,',
    firma: {
      nombre: txt(d.nombre_asesor),
      cargo: txt(d.cargo_asesor),
      empresa: BRIKA_EMPRESA,
      contacto: `${CONTACT_EMAIL}  |  ${CONTACT_PHONE}`,
    },
    aceptacionTitulo: 'ACEPTACIÓN (OPCIONAL)',
    aceptacionLabels: ['Nombre y firma — Propietario / Representante legal', 'Fecha de aceptación'],
    footer: [
      `${BRIKA_EMPRESA} · Querétaro, México · ${CONTACT_EMAIL} · ${CONTACT_PHONE}`,
      'Documento de carácter confidencial, preparado exclusivamente para el destinatario indicado.',
    ],
  }
}
