import type { InventarioListItem } from './inventario'

/** Propiedad del inventario tal como la lista el selector de la Carta Propuesta. */
export type CartaProperty = InventarioListItem

/** Columnas completas del inventario que la carta prellena (GET /api/properties/[id]). */
export interface CartaPropertyDetail {
  m2_terreno: number | null
  m2_construccion: number | null
  m2_rentables: number | null
  area_base_calculo: string | null
  precio_venta_m2: number | null
  precio_renta_m2: number | null
  precio_total_venta: number | null
  renta_mensual: number | null
  /** Columna `disponibilidad` del inventario (fecha/texto de entrega); viaja como `fecha_entrega`. */
  fecha_entrega: string | null
}

/** Tipo de propuesta: compra (venta / preventa) o renta (arrendamiento). */
export type CartaOperacion = 'compra' | 'renta'

/**
 * Estado del formulario (plantilla public/pdf/BRIKA_Plantilla_Carta_Propuesta_Ejemplo.pdf).
 * Todo como string para controlar los inputs; lo vacío no aparece en la carta.
 */
export interface CartaFormState {
  selectedProperty: CartaProperty | null
  propertyDetail: CartaPropertyDetail | null
  operacion: CartaOperacion
  // Expedición (encabezado de fecha)
  ciudadExpedicion: string
  estadoExpedicion: string
  // Destinatario
  destinatarioNombre: string
  destinatarioCargo: string
  destinatarioEmpresa: string
  // Cliente representado
  nombreCliente: string
  // Inmueble
  inmuebleDescripcion: string
  superficie: string
  parque: string
  unidad: string
  // Renta
  rentaMensual: string
  rentaMasIva: boolean
  plazoAnios: string
  depositoMeses: string
  incrementoAnual: string
  // Venta
  precioCompra: string
  formaPago: string
  enganchePct: string
  // Comunes
  fechaInicio: string
  condicionesEspeciales: string
  vigenciaDias: string
  // Remitente (BRIKA)
  nombreAsesor: string
  cargoAsesor: string
}
