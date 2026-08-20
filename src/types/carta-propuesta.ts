import type { InventarioListItem } from './inventario'

/** Propiedad del inventario tal como la consume el módulo Carta Propuesta. */
export type CartaProperty = InventarioListItem

/** Estado del formulario: todo como string para controlar los inputs. */
export interface CartaFormState {
  selectedProperty: CartaProperty | null
  nombreAsesor: string
  nombreCliente: string
  nombrePropietario: string
  direccion: string
  parque: string
  unidad: string
  valorInversion: string
  apartado: string
  enganche: string
  pctEnganche: string
  mensualidades: string
  montoMensualidades: string
  pagoEscritura: string
}
