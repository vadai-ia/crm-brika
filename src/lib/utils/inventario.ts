// Puente entre el frontend (claves legacy del esquema Kibah) y la tabla
// real de brika: public.inventario_industrial. El frontend sigue pidiendo
// nombre_kibah/precio_unidad/colonia/etc.; aquí se traducen filtros y
// orden hacia las columnas reales, y las filas se remapean de vuelta.

import { formatPrice } from '@/lib/utils/format'

export const INVENTARIO_TABLE = 'inventario_industrial'

// Clave del frontend → columna real (filtros eq, rangos y sort)
export const KEY_TO_COLUMN: Record<string, string> = {
  id: 'id',
  created_at: 'created_at',
  nombre_desarrollador: 'parque',
  nombre_kibah: 'parque',
  unidad: 'unidad',
  disponibilidad: 'estatus',
  precio_unidad: 'precio_total_venta',
  m2_totales: 'm2_terreno',
  m2_habitables: 'm2_construccion',
  m2_exteriores: 'm2_rentables',
  colonia: 'zona_corredor',
  alcaldia: 'municipio',
  direccion: 'ubicacion',
  tipo_preventa: 'operacion',
  tipo_entrega: 'tipo_producto',
  fecha_entrega: 'disponibilidad',
  fecha_actualizacion: 'ultima_actualizacion',
  amenidades: 'notas_tecnicas',
  link_drive: 'links_imagenes_carpetas_drive',
}

// Columnas reales donde aplica la búsqueda de texto libre
export const SEARCH_COLUMNS = [
  'parque',
  'zona_corredor',
  'municipio',
  'estado',
  'producto',
  'unidad',
  'ubicacion',
]

type Row = Record<string, unknown>

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

// Precio mostrado: operaciones de renta usan renta_mensual; venta usa
// precio_total_venta. Se prefiere el valor no-cero disponible.
function precioMostrado(row: Row): number | null {
  const venta = num(row.precio_total_venta)
  const renta = num(row.renta_mensual)
  const esRenta = String(row.operacion ?? '').toLowerCase().includes('renta')
  return esRenta ? renta || venta : venta || renta
}

/** Precio para listar una fila ligera: renta mensual si la operación es renta, si no precio de venta. */
export function precioListado(item: {
  operacion: string | null
  precio_total_venta: number | null
  renta_mensual: number | null
}): string {
  const esRenta = (item.operacion ?? '').toLowerCase().includes('renta')
  if (esRenta && item.renta_mensual) return `${formatPrice(item.renta_mensual)} / mes`
  if (item.precio_total_venta) return formatPrice(item.precio_total_venta)
  if (item.renta_mensual) return `${formatPrice(item.renta_mensual)} / mes`
  return formatPrice(null)
}

export function mapInventarioRow(row: Row): Row {
  return {
    id: row.id,
    created_at: row.created_at,
    id_propiedad: row.id,
    nombre_desarrollador: row.parque ?? null,
    nombre_kibah: row.parque ?? null,
    unidad: row.unidad ?? null,
    fecha_actualizacion: row.ultima_actualizacion ?? null,
    disponibilidad: row.estatus ?? null,
    precio_unidad: precioMostrado(row),
    m2_totales: num(row.m2_terreno),
    m2_habitables: num(row.m2_construccion),
    m2_exteriores: num(row.m2_rentables),
    m2_roof_garden: null,
    num_recamaras: null,
    num_banos: null,
    estacionamiento: null,
    bodega: null,
    amenidades: row.notas_tecnicas ?? null,
    direccion: row.ubicacion ?? null,
    colonia: row.zona_corredor ?? null,
    alcaldia: row.municipio ?? null,
    contacto_desarrollador: null,
    fecha_entrega: row.disponibilidad ?? null,
    tipo_preventa: row.operacion ?? null,
    tipo_entrega: row.tipo_producto ?? null,
    pct_comision: null,
    link_drive: row.links_imagenes_carpetas_drive ?? null,
    // Campos propios del inventario (nombres reales), disponibles para el
    // detalle y para inicializar el formulario de edición. La columna real
    // `disponibilidad` no se re-expone aquí (colisiona con el alias legacy);
    // usar `fecha_entrega`.
    parque: row.parque ?? null,
    estado: row.estado ?? null,
    municipio: row.municipio ?? null,
    zona_corredor: row.zona_corredor ?? null,
    producto: row.producto ?? null,
    tipo_producto: row.tipo_producto ?? null,
    operacion: row.operacion ?? null,
    estatus: row.estatus ?? null,
    m2_terreno: num(row.m2_terreno),
    m2_construccion: num(row.m2_construccion),
    m2_rentables: num(row.m2_rentables),
    area_base_calculo: row.area_base_calculo ?? null,
    moneda: row.moneda ?? null,
    precio_venta_m2: num(row.precio_venta_m2),
    precio_renta_m2: num(row.precio_renta_m2),
    precio_total_venta: num(row.precio_total_venta),
    renta_mensual: num(row.renta_mensual),
    mantenimiento_m2: num(row.mantenimiento_m2),
    mantenimiento_mensual: num(row.mantenimiento_mensual),
    kva_disponibles: row.kva_disponibles ?? null,
    altura_libre: row.altura_libre ?? null,
    piso: row.piso ?? null,
    sistema_contra_incendios: row.sistema_contra_incendios ?? null,
    certificaciones: row.certificaciones ?? null,
    iluminacion: row.iluminacion ?? null,
    andenes: row.andenes ?? null,
    rampas: row.rampas ?? null,
    ultima_actualizacion: row.ultima_actualizacion ?? null,
    notas_tecnicas: row.notas_tecnicas ?? null,
    links_imagenes_carpetas_drive: row.links_imagenes_carpetas_drive ?? null,
    ubicacion: row.ubicacion ?? null,
  }
}
