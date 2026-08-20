import { z } from 'zod'
import { THEME_OPTIONS } from '@/lib/utils/constants'

// Zod v4 (ver ERROR-JOURNAL #3): `{ message }` en enums, `.issues` en ZodError.

const emailSchema = z.string().trim().email('Email inválido').max(254, 'Email demasiado largo')
const nameSchema = z.string().trim().min(1, 'Nombre es requerido').max(120, 'Máximo 120 caracteres')
const roleSchema = z.string().trim().min(1, 'Rol es requerido').max(60, 'Rol inválido')
const themeSchema = z.enum(THEME_OPTIONS, { message: 'Tema inválido' })

/** URL de avatar: acepta URL válida, cadena vacía o null (ambas se normalizan a null). */
const avatarSchema = z
  .union([z.string().trim().url('URL inválida'), z.literal(''), z.null()])
  .transform((v) => (v ? v : null))

export const createAsesorSchema = z.object({
  email: emailSchema,
  full_name: nameSchema,
  password: z
    .string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .max(72, 'Contraseña demasiado larga'),
  role: roleSchema.optional(),
  avatar_url: avatarSchema.optional(),
})

export const updateAsesorSchema = z
  .object({
    email: emailSchema.optional(),
    full_name: nameSchema.optional(),
    role: roleSchema.optional(),
    is_active: z.boolean().optional(),
    avatar_url: avatarSchema.optional(),
    theme_preference: themeSchema.nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'No hay cambios que guardar',
  })

export type CreateAsesorInput = z.infer<typeof createAsesorSchema>
export type UpdateAsesorInput = z.infer<typeof updateAsesorSchema>
