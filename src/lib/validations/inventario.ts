import { z } from 'zod'

// Validación para escritura en public.inventario_industrial.
// Los nombres de campo coinciden 1:1 con las columnas de la tabla,
// así que el payload validado se inserta/actualiza sin remapear.

const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()

const numeroOpcional = z.number().finite().nullable().optional()

const fechaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (AAAA-MM-DD)')
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null))

export const createInventarioSchema = z.object({
  // Identificación (NOT NULL en la tabla)
  parque: z.string().trim().min(1, 'El parque es requerido'),
  estado: z.string().trim().min(1, 'El estado es requerido'),
  municipio: textoOpcional,
  zona_corredor: z.string().trim().min(1, 'La zona/corredor es requerida'),
  producto: z.string().trim().min(1, 'El producto es requerido'),
  unidad: z.string().trim().min(1, 'La unidad es requerida'),
  operacion: z.string().trim().min(1, 'La operación es requerida'),
  tipo_producto: textoOpcional,
  estatus: z.string().trim().min(1).default('Disponible'),

  // Superficies
  m2_terreno: numeroOpcional,
  m2_construccion: numeroOpcional,
  m2_rentables: numeroOpcional,
  area_base_calculo: textoOpcional,

  // Precios
  moneda: z.string().trim().max(3).default('MXN'),
  precio_venta_m2: numeroOpcional,
  precio_renta_m2: numeroOpcional,
  precio_total_venta: numeroOpcional,
  renta_mensual: numeroOpcional,
  mantenimiento_m2: numeroOpcional,
  mantenimiento_mensual: numeroOpcional,

  // Disponibilidad
  disponibilidad: textoOpcional,

  // Características técnicas
  kva_disponibles: textoOpcional,
  altura_libre: textoOpcional,
  piso: textoOpcional,
  sistema_contra_incendios: textoOpcional,
  certificaciones: textoOpcional,
  iluminacion: textoOpcional,
  andenes: textoOpcional,
  rampas: textoOpcional,

  // Información adicional
  ultima_actualizacion: fechaOpcional,
  notas_tecnicas: textoOpcional,
  links_imagenes_carpetas_drive: textoOpcional,
  ubicacion: textoOpcional,
})

export const updateInventarioSchema = createInventarioSchema.partial()

export type CreateInventarioInput = z.infer<typeof createInventarioSchema>
export type UpdateInventarioInput = z.infer<typeof updateInventarioSchema>
