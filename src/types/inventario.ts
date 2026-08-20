/**
 * Fila ligera del inventario para selectores (PDF, Carta Propuesta): solo lo
 * necesario para listar y buscar. Columnas reales de `inventario_industrial`.
 */
export interface InventarioListItem {
  id: string
  parque: string | null
  unidad: string | null
  zona_corredor: string | null
  municipio: string | null
  estado: string | null
  /** En la BD suele ser un link de Google Maps, no una dirección postal. */
  ubicacion: string | null
  producto: string | null
  tipo_producto: string | null
  operacion: string | null
  precio_total_venta: number | null
  renta_mensual: number | null
}
