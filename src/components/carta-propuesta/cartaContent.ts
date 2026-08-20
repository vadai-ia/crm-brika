// Texto de la Carta Propuesta BRIKA (propuesta de compra industrial).
// Único lugar donde se redacta: PDF y Word solo dibujan lo que sale de aquí.
// Regla: todo campo vacío, null o 0 se omite; las frases se reacomodan.

export interface CartaPropuestaData {
  nombre_asesor: string
  nombre_cliente: string
  nombre_propietario: string
  parque: string
  unidad: string
  direccion: string
  municipio: string
  estado: string
  /** 'nave industrial' | 'lote industrial' | 'propiedad industrial' */
  tipo_inmueble: string
  valor_inversion: number
  cantidad_apartado: number
  enganche: number
  pct_enganche: number
  mensualidades: number
  monto_mensualidades: number
  pago_escritura: number
}

export interface TextSeg {
  text: string
  bold: boolean
}

export interface CartaContent {
  fecha: string
  titulo: string
  saludo: string
  asesorLabel: string
  asesorNombre: string
  intro: string
  ofrecen: string
  valorLine: string | null
  bullets: string[]
  documentosTitulo: string
  documentos: TextSeg[]
  firmaComprador: { label: string; nombre: string }
  firmaPropietario: { label: string; nombre: string }
}

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

const has = (n: number): boolean => Number.isFinite(n) && n > 0
const txt = (s: string | null | undefined): string => (s ?? '').trim()

/** Tipo de inmueble a partir de `producto` / `tipo_producto` del inventario. */
export function inmuebleFromProducto(producto?: string | null, tipoProducto?: string | null): string {
  const p = `${producto ?? ''} ${tipoProducto ?? ''}`.toLowerCase()
  if (p.includes('lote') || p.includes('terreno')) return 'lote industrial'
  if (p.includes('nave') || p.includes('bts') || p.includes('bodega')) return 'nave industrial'
  return 'propiedad industrial'
}

function articulo(tipo: string): string {
  return tipo.startsWith('lote') ? 'el' : 'la'
}

function mensualidadesTxt(n: number): string {
  const k = Math.round(n)
  return k === 1 ? '1 mensualidad' : `${k} mensualidades`
}

/**
 * Describe el inmueble precedido de "de", omitiendo lo que no se tenga:
 * "de la nave industrial 14 del parque Acupark, en Querétaro" / "del lote industrial 7 …".
 */
function describirInmueble(d: CartaPropuestaData): string {
  const tipo = txt(d.tipo_inmueble) || 'propiedad industrial'
  const unidad = txt(d.unidad)
  const parque = txt(d.parque)
  const direccion = txt(d.direccion)
  const lugar = [...new Set([txt(d.municipio), txt(d.estado)].filter(Boolean))].join(', ')

  const art = articulo(tipo) === 'el' ? 'del' : 'de la'
  let desc = `${art} ${tipo}${unidad ? ` ${unidad}` : ''}`
  if (parque) desc += /^parque/i.test(parque) ? ` de ${parque}` : ` del parque ${parque}`

  const extras: string[] = []
  if (direccion) extras.push(`con domicilio en ${direccion}`)
  if (lugar) extras.push(`en ${lugar}`)
  if (extras.length) desc += `${parque ? ', ' : ' '}${extras.join(', ')}`
  return desc
}

export function buildCartaContent(d: CartaPropuestaData): CartaContent {
  const propietario = txt(d.nombre_propietario)
  const apartado = has(d.cantidad_apartado)
  const enganche = has(d.enganche)
  const pctEng = has(d.pct_enganche)
  const mens = has(d.mensualidades)
  const monto = has(d.monto_mensualidades)
  const escritura = has(d.pago_escritura)
  const saldoPct = pctEng && d.pct_enganche < 100 ? ` (${fmtPct(100 - d.pct_enganche)})` : ''

  const detalle: string[] = []
  if (apartado) {
    detalle.push(
      `Se compromete a dar un apartado por la cantidad de ${fmtMoney(d.cantidad_apartado)} MXN como garantía de concretar la operación cuanto antes.`
    )
  }
  if (enganche) {
    detalle.push(
      `Se dará un enganche a la firma del contrato de compraventa por la cantidad de ${fmtMoney(d.enganche)} MXN` +
      `${pctEng ? ` (${fmtPct(d.pct_enganche)})` : ''} con recursos propios${apartado ? ', tomando en cuenta el apartado' : ''}.`
    )
  }
  if (mens && monto && escritura) {
    detalle.push(
      `El saldo restante${saldoPct} se cubrirá en ${mensualidadesTxt(d.mensualidades)} de ${fmtMoney(d.monto_mensualidades)} MXN ` +
      `y ${fmtMoney(d.pago_escritura)} MXN a la firma de escrituras.`
    )
  } else if (mens && monto) {
    detalle.push(`El saldo restante${saldoPct} se cubrirá en ${mensualidadesTxt(d.mensualidades)} de ${fmtMoney(d.monto_mensualidades)} MXN.`)
  } else if (mens) {
    detalle.push(`El saldo restante${saldoPct} se cubrirá en ${mensualidadesTxt(d.mensualidades)}.`)
  } else if (escritura) {
    detalle.push(`El saldo restante${saldoPct} de ${fmtMoney(d.pago_escritura)} MXN se pagará a la firma de escrituras.`)
  } else if (monto) {
    detalle.push(`Se cubrirán mensualidades de ${fmtMoney(d.monto_mensualidades)} MXN.`)
  }

  const bullets: string[] = []
  if (has(d.valor_inversion) && detalle.length > 0) {
    bullets.push(`La cantidad total de ${fmtMoney(d.valor_inversion)} MXN, de los cuales:`)
  }
  bullets.push(...detalle)

  const documentos: TextSeg[] = [
    {
      text:
        'Esta oferta de compra está sujeta a la revisión de los documentos correspondientes. En caso de no existir ' +
        'impedimento legal alguno, se celebrará un contrato privado de compraventa que describirá los términos y ' +
        'condiciones de la operación, para su posterior protocolización en escritura pública ante notario público.',
      bold: false,
    },
  ]
  if (apartado) {
    documentos.push(
      { text: ' El inmueble apartado será respetado por un periodo de ', bold: false },
      { text: '7 días hábiles', bold: true },
      {
        text:
          ' a partir de la fecha de este recibo, con el fin de llevar a cabo la firma del contrato correspondiente. ' +
          'En caso de que no se realice dicha firma dentro del plazo establecido, el monto entregado será ',
        bold: false,
      },
      { text: 'devuelto al cliente dentro de los siguientes 15 días hábiles', bold: true },
      { text: ', contados a partir del vencimiento del periodo de apartado.', bold: false }
    )
  }

  return {
    fecha: cartaFecha(),
    titulo: 'PROPUESTA DE COMPRA',
    saludo: 'PRESENTE',
    asesorLabel: 'Asesor Comercial: ',
    asesorNombre: txt(d.nombre_asesor),
    intro:
      `Por su conducto, como mediador en la operación ${describirInmueble(d)}, ` +
      'hacemos de su conocimiento nuestro interés en la compraventa de dicho inmueble.',
    ofrecen: propietario
      ? `Los compradores ofrecen a su legítimo propietario, ${propietario}:`
      : 'Los compradores ofrecen a su legítimo propietario:',
    valorLine: has(d.valor_inversion) ? `Valor de la inversión: ${fmtMoney(d.valor_inversion)} MXN` : null,
    bullets,
    documentosTitulo: 'Documentos',
    documentos,
    firmaComprador: { label: 'Nombre y firma del comprador', nombre: txt(d.nombre_cliente) },
    firmaPropietario: { label: 'Nombre y firma del propietario', nombre: propietario },
  }
}
