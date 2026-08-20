import { z } from 'zod'

// Notas/recordatorios (tabla public.anuncios del esquema brika)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const createNotaSchema = z.object({
  titulo: z.string().trim().max(200, 'Máximo 200 caracteres').nullable().optional(),
  nota: z.string().trim().min(1, 'La nota es requerida'),
  id_responsable: z.string().uuid('Responsable inválido').nullable().optional(),
  id_propiedad: z.string().uuid('Propiedad inválida').nullable().optional(),
  after_date: z.string().regex(DATE_RE, 'Fecha inválida (YYYY-MM-DD)').nullable().optional(),
})

export const updateNotaSchema = z.object({
  titulo: z.string().trim().max(200, 'Máximo 200 caracteres').nullable().optional(),
  nota: z.string().trim().min(1, 'La nota es requerida').optional(),
  id_responsable: z.string().uuid('Responsable inválido').nullable().optional(),
  id_propiedad: z.string().uuid('Propiedad inválida').nullable().optional(),
  after_date: z.string().regex(DATE_RE, 'Fecha inválida (YYYY-MM-DD)').nullable().optional(),
  completada: z.boolean().optional(),
})

export type CreateNotaInput = z.infer<typeof createNotaSchema>
export type UpdateNotaInput = z.infer<typeof updateNotaSchema>
