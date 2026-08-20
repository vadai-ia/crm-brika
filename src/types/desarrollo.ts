export interface Desarrollo {
  id: number
  created_at: string
  id_propiedad: string
  nombre_kibah: string | null
  nombre_desarrollador: string | null
  fecha_actualizacion: string | null
  disponibilidad: string | null
  precio_min: number | null
  precio_max: number | null
  m2_totales_min: number | null
  m2_totales_max: number | null
  recamaras_min: number | null
  recamaras_max: number | null
  banos_min: number | null
  banos_max: number | null
  estacionamientos_min: number | null
  estacionamientos_max: number | null
  bodega: string | null
  amenidades: string | null
  direccion: string | null
  direccion_bdd: string | null
  colonia: string | null
  alcaldia: string | null
  contacto_desarrollador: string | null
  fecha_entrega: string | null
  tipo_preventa: string | null
  tipo_entrega: string | null
  pct_comision: number | null
  descripcion: string | null
  imagen_principal: string | null
  link_maps: string | null
  imagen_1: string | null
  imagen_2: string | null
  imagen_3: string | null
}
