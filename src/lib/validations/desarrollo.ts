import { z } from 'zod'

export const createDesarrolloSchema = z.object({
  // Required
  nombre_kibah: z.string().min(1, 'Nombre BRIKA es requerido'),
  disponibilidad: z.string().min(1, 'Disponibilidad es requerida'),
  colonia: z.string().min(1, 'Colonia es requerida'),
  alcaldia: z.string().min(1, 'Alcaldía es requerida'),
  tipo_preventa: z.string().min(1, 'Tipo preventa es requerido'),
  imagen_principal: z.string().min(1, 'Imagen principal es requerida'),
  descripcion: z.string().min(1, 'Descripción es requerida'),
  link_maps: z.string().min(1, 'Código Mapa es requerido'),

  // Optional
  nombre_desarrollador: z.string().nullable().optional(),
  precio_min: z.number().nonnegative().nullable().optional(),
  precio_max: z.number().nonnegative().nullable().optional(),
  m2_totales_min: z.number().nonnegative().nullable().optional(),
  m2_totales_max: z.number().nonnegative().nullable().optional(),
  recamaras_min: z.number().nonnegative().nullable().optional(),
  recamaras_max: z.number().nonnegative().nullable().optional(),
  banos_min: z.number().nonnegative().nullable().optional(),
  banos_max: z.number().nonnegative().nullable().optional(),
  estacionamientos_min: z.number().nonnegative().nullable().optional(),
  estacionamientos_max: z.number().nonnegative().nullable().optional(),
  bodega: z.string().nullable().optional(),
  amenidades: z.string().nullable().optional(),
  direccion: z.string().nullable().optional(),
  direccion_bdd: z.string().nullable().optional(),
  contacto_desarrollador: z.string().nullable().optional(),
  fecha_entrega: z.string().nullable().optional(),
  tipo_entrega: z.string().nullable().optional(),
  pct_comision: z.string().nullable().optional(),
  imagen_1: z.string().nullable().optional(),
  imagen_2: z.string().nullable().optional(),
  imagen_3: z.string().nullable().optional(),
})

export const updateDesarrolloSchema = createDesarrolloSchema.partial()

export type CreateDesarrolloInput = z.infer<typeof createDesarrolloSchema>
export type UpdateDesarrolloInput = z.infer<typeof updateDesarrolloSchema>

const DESARROLLO_COLUMN_MAP: Record<string, string> = {
  nombre_kibah: 'Nombre BRIKA',
  nombre_desarrollador: 'Nombre Desarrollador',
  fecha_actualizacion: 'Fecha de Actualización',
  disponibilidad: 'Disponibilidad',
  precio_min: 'Precio Min',
  precio_max: 'Precio Max',
  m2_totales_min: 'M2 Totales Min',
  m2_totales_max: 'M2 Totales Max',
  recamaras_min: 'Recámaras Min',
  recamaras_max: 'Recámaras Max',
  banos_min: 'Baños Min',
  banos_max: 'Baños Max',
  estacionamientos_min: 'Estacionamientos Min',
  estacionamientos_max: 'Estacionamientos Max',
  bodega: 'Bodega',
  amenidades: 'Amenidades',
  direccion: 'Dirección',
  direccion_bdd: 'Dirección BDD',
  colonia: 'Colonia',
  alcaldia: 'Alcaldia',
  contacto_desarrollador: 'Desarrollador/Propietario (Whats grupo)',
  fecha_entrega: 'Fecha de Construcción/Entrega',
  tipo_preventa: 'Entrega Inmediata/Preventa',
  tipo_entrega: 'Tipo de Entrega',
  pct_comision: '% Comisión',
  descripcion: 'Descripción Desarrollo',
  imagen_principal: 'Link Imagen',
  link_maps: 'Link Maps',
  imagen_1: 'Imagen 1',
  imagen_2: 'Imagen 2',
  imagen_3: 'Imagen 3',
}

export function mapDesarrolloToDB(data: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    const dbColumn = DESARROLLO_COLUMN_MAP[key]
    if (dbColumn) {
      mapped[dbColumn] = value === '' ? null : value
    }
  }
  return mapped
}
