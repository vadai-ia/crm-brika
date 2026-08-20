// Traduce una fila de inventario_industrial (ya mapeada por mapInventarioRow)
// al contenido de la Ficha Técnica Comercial BRIKA.
//
// REGLA DE CONFIDENCIALIDAD: la ficha NUNCA incluye datos que identifiquen el
// inmueble o a terceros — parque, ubicacion (dirección exacta), unidad/lote ni
// notas_tecnicas (texto libre que puede nombrar parques o desarrolladores).
// Solo referencias amplias: municipio/estado y zona/corredor.

import type { Property } from '@/types'
import { fmtMoney, fmtMoneyDec, fmtNum } from './theme'

export interface FichaStat {
  value: string
  unit?: string
  label: string
  sub?: string
}

export interface FichaRow {
  label: string
  value: string
}

export interface FichaSection {
  title: string
  rows: FichaRow[]
}

export interface FichaCommercial {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}

export interface FichaData {
  eyebrow: string
  title: string
  subtitle: string
  description: string
  stats: FichaStat[]
  chips: string[]
  sections: FichaSection[]
  commercial: FichaCommercial[]
  headerRight: [string, string]
  dispLine: string
  locationParagraph: string
  locationBullets: string[]
  locationLabel: string
  filenameBits: { producto: string; m2: string; lugar: string }
}

type Raw = Record<string, string | number | null | undefined>

function txt(r: Raw, k: string): string {
  const v = r[k]
  return v === null || v === undefined ? '' : String(v).trim()
}

function numv(r: Raw, k: string): number | null {
  const v = r[k]
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) || n === 0 ? null : n
}

// "10" → "10 m"; "10 m" queda igual (columnas de texto que a veces ya traen unidad)
function withUnit(v: string, unit: string): string {
  if (/^[\d.,\s]+$/.test(v)) {
    const n = Number(v.replace(/,/g, ''))
    if (!Number.isNaN(n)) return `${fmtNum(n)} ${unit}`
  }
  return v
}

function plural(v: string, singular: string, pluralWord: string): string {
  const n = Number(v.replace(/,/g, ''))
  if (!Number.isNaN(n)) return `${fmtNum(n)} ${n === 1 ? singular : pluralWord}`
  return v
}

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1]
}

export function buildFicha(property: Property): FichaData {
  const r = property as unknown as Raw

  const producto = txt(r, 'producto') || txt(r, 'tipo_producto') || 'Propiedad industrial'
  const esFem = /^(nave|bodega|planta|propiedad)/i.test(producto)
  const operacion = txt(r, 'operacion')
  const esRenta = operacion.toLowerCase().includes('renta')
  const municipio = txt(r, 'municipio')
  const estado = txt(r, 'estado')
  const zona = txt(r, 'zona_corredor')
  const moneda = txt(r, 'moneda') || 'MXN'
  // La columna real `disponibilidad` viaja bajo el alias legacy fecha_entrega
  const disp = txt(r, 'fecha_entrega')

  const m2Rentables = numv(r, 'm2_rentables')
  const m2Construccion = numv(r, 'm2_construccion')
  const m2Terreno = numv(r, 'm2_terreno')
  const area = m2Rentables ?? m2Construccion ?? m2Terreno
  const altura = txt(r, 'altura_libre')
  const andenes = txt(r, 'andenes')
  const rampas = txt(r, 'rampas')
  const kva = txt(r, 'kva_disponibles')
  const piso = txt(r, 'piso')
  const sci = txt(r, 'sistema_contra_incendios')
  const tieneSci = !!sci && !/^(no|n\/a|na|-)$/i.test(sci)
  const certificaciones = txt(r, 'certificaciones')
  const iluminacion = txt(r, 'iluminacion')
  const renta = numv(r, 'renta_mensual')
  const rentaM2 = numv(r, 'precio_renta_m2')
  const venta = numv(r, 'precio_total_venta')
  const ventaM2 = numv(r, 'precio_venta_m2')
  const mantMensual = numv(r, 'mantenimiento_mensual')
  const mantM2 = numv(r, 'mantenimiento_m2')

  const lugar = [municipio, estado].filter(Boolean).join(', ')

  // --- Página 1 ---
  const eyebrow = `${producto} · Ficha comercial`.toUpperCase()
  const title = area ? `${producto} — ${fmtNum(area)} m²` : producto
  const subtitle = [
    operacion ? `Disponible para ${operacion.toLowerCase()}` : '',
    lugar,
    zona,
  ].filter(Boolean).join('  |  ')

  const stats: FichaStat[] = []
  if (area) {
    stats.push({ value: fmtNum(area), unit: 'm²', label: m2Rentables ? 'ÁREA RENTABLE' : 'SUPERFICIE' })
  }
  if (altura) stats.push({ value: withUnit(altura, 'm'), label: 'ALTURA LIBRE' })
  if (andenes) stats.push({ value: plural(andenes, 'andén', 'andenes'), label: 'LOGÍSTICA' })
  else if (rampas) stats.push({ value: plural(rampas, 'rampa', 'rampas'), label: 'LOGÍSTICA' })
  if (kva) stats.push({ value: withUnit(kva, 'KVA'), label: 'ENERGÍA DISPONIBLE' })
  if (esRenta && renta) {
    stats.push({ value: fmtMoney(renta), label: 'RENTA MENSUAL', sub: `(${moneda})` })
  } else if (venta) {
    stats.push({ value: fmtMoney(venta), label: 'PRECIO DE VENTA', sub: `(${moneda})` })
  }

  const features: string[] = []
  if (andenes) features.push(`${plural(andenes, 'andén', 'andenes')} de maniobras`)
  if (piso) features.push(`piso de ${lcFirst(piso)}`)
  if (tieneSci) features.push('sistema contra incendios')
  if (kva) features.push(`${withUnit(kva, 'KVA')} de energía disponible`)
  const zonaFrase = zona
    ? /^corredor/i.test(zona) ? `, sobre el ${lcFirst(zona)}` : `, en la zona ${zona}`
    : ''
  const s1 = `${producto} disponible para ${operacion ? operacion.toLowerCase() : 'su operación'}${lugar ? ` en ${lugar}` : ''}${zonaFrase}.`
  const s2 = features.length ? ` Cuenta con ${joinList(features)}.` : ''
  const s3 = disp ? ` Disponibilidad: ${lcFirst(disp)}.` : ''
  const description = s1 + s2 + s3

  const chips: string[] = []
  if (tieneSci) chips.push('Sistema contra incendios')
  if (certificaciones) chips.push(certificaciones)
  if (iluminacion) chips.push(/ilumin/i.test(iluminacion) ? iluminacion : `Iluminación ${lcFirst(iluminacion)}`)
  if (andenes) chips.push(plural(andenes, 'andén', 'andenes'))
  if (rampas) chips.push(plural(rampas, 'rampa', 'rampas'))
  if (altura) chips.push(`Altura libre ${withUnit(altura, 'm')}`)
  if (kva) chips.push(withUnit(kva, 'KVA'))

  // --- Página 2 ---
  const superficies: FichaRow[] = []
  if (m2Terreno) superficies.push({ label: 'Superficie de terreno', value: `${fmtNum(m2Terreno)} m²` })
  if (m2Construccion) superficies.push({ label: 'Superficie de construcción', value: `${fmtNum(m2Construccion)} m²` })
  if (m2Rentables) superficies.push({ label: 'Área rentable', value: `${fmtNum(m2Rentables)} m²` })

  const especificaciones: FichaRow[] = []
  if (altura) especificaciones.push({ label: 'Altura libre', value: withUnit(altura, 'm') })
  if (piso) especificaciones.push({ label: 'Piso', value: piso })
  if (iluminacion) especificaciones.push({ label: 'Iluminación', value: iluminacion })

  const logistica: FichaRow[] = []
  if (andenes) logistica.push({ label: 'Andenes', value: andenes })
  if (rampas) logistica.push({ label: 'Rampas', value: rampas })
  const tipoProducto = txt(r, 'tipo_producto')
  if (tipoProducto && tipoProducto !== producto) logistica.push({ label: 'Tipo de producto', value: tipoProducto })

  const infraestructura: FichaRow[] = []
  if (kva) infraestructura.push({ label: 'Energía disponible', value: withUnit(kva, 'KVA') })
  if (sci) infraestructura.push({ label: 'Sistema contra incendios', value: sci })
  if (certificaciones) infraestructura.push({ label: 'Certificaciones', value: certificaciones })

  const sections: FichaSection[] = [
    { title: 'SUPERFICIES', rows: superficies },
    { title: 'ESPECIFICACIONES', rows: especificaciones },
    { title: 'LOGÍSTICA', rows: logistica },
    { title: 'INFRAESTRUCTURA', rows: infraestructura },
  ].filter((s) => s.rows.length > 0)

  const commercial: FichaCommercial[] = []
  if (operacion) commercial.push({ label: 'OPERACIÓN', value: operacion })
  if (esRenta && renta) {
    commercial.push({
      label: 'RENTA MENSUAL',
      value: `${fmtMoney(renta)} ${moneda}`,
      sub: rentaM2 ? `${fmtMoneyDec(rentaM2)} / m²` : undefined,
      highlight: true,
    })
  }
  if (venta && (!esRenta || operacion.toLowerCase().includes('venta'))) {
    commercial.push({
      label: 'PRECIO DE VENTA',
      value: `${fmtMoney(venta)} ${moneda}`,
      sub: ventaM2 ? `${fmtMoneyDec(ventaM2)} / m²` : undefined,
      highlight: !(esRenta && renta),
    })
  }
  if (mantMensual || mantM2) {
    commercial.push({
      label: 'MANTENIMIENTO',
      value: mantMensual ? `${fmtMoney(mantMensual)} ${moneda}` : `${fmtMoneyDec(mantM2 as number)} / m²`,
      sub: mantMensual && mantM2 ? `${fmtMoneyDec(mantM2)} / m²` : undefined,
    })
  }
  if (disp) commercial.push({ label: 'DISPONIBILIDAD', value: disp })

  const locationParagraph =
    `${producto} ubicad${esFem ? 'a' : 'o'}${lugar ? ` en ${lugar}` : ' en la región del Bajío'}${zonaFrase} — ` +
    'una de las zonas industriales con mayor actividad logística de la región.'
  const locationBullets = [
    lugar,
    zona,
    disp ? `Disponibilidad ${lcFirst(disp)}` : '',
  ].filter(Boolean)

  return {
    eyebrow,
    title,
    subtitle,
    description,
    stats: stats.slice(0, 5),
    chips,
    sections,
    commercial: commercial.slice(0, 5),
    headerRight: [
      'FICHA TÉCNICA COMERCIAL',
      [producto, municipio || estado].filter(Boolean).join(' · ').toUpperCase(),
    ],
    dispLine: disp ? `Disponibilidad: ${lcFirst(disp)}` : '',
    locationParagraph,
    locationBullets,
    locationLabel: [zona, municipio].filter(Boolean).join(' · ').toUpperCase(),
    filenameBits: {
      producto: producto.split(' ')[0],
      m2: area ? `${Math.round(area)}m2` : '',
      lugar: municipio || estado,
    },
  }
}

function sanitize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function buildFilename(fichas: FichaData[]): string {
  if (fichas.length === 1) {
    const b = fichas[0].filenameBits
    const parts = ['BRIKA_Ficha_Tecnica', sanitize(b.producto), b.m2, sanitize(b.lugar)].filter(Boolean)
    return parts.join('_') + '.pdf'
  }
  const date = new Date().toISOString().slice(0, 10)
  return `BRIKA_Fichas_Tecnicas_${date}.pdf`
}
