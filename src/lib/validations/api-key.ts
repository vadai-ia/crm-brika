import { z } from 'zod'

const PERMISSIONS = ['properties.read', 'properties.write'] as const

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  permissions: z.array(z.enum(PERMISSIONS)).default(['properties.read']),
  expires_at: z.string().nullable().optional(),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
