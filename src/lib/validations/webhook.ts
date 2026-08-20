import { z } from 'zod'

const WEBHOOK_EVENTS = [
  'property.created',
  'property.updated',
  'property.deleted',
] as const

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  url: z.string().url('URL inválida'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'Selecciona al menos un evento'),
  headers: z.record(z.string(), z.string()).optional(),
})

export const updateWebhookSchema = createWebhookSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>
