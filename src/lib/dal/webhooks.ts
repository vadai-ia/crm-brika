import { createAdminClient } from '@/lib/supabase/admin'
import type { Webhook } from '@/types'
import crypto from 'crypto'

export async function getWebhooks(): Promise<Webhook[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching webhooks:', error.message)
    throw new Error(error.message)
  }
  return data as Webhook[]
}

export async function getWebhookById(id: string): Promise<Webhook | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as Webhook
}

export async function getActiveWebhooksByEvent(event: string): Promise<Webhook[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('is_active', true)
    .contains('events', [event])

  if (error) {
    console.error('Error fetching active webhooks:', error.message)
    return []
  }
  return data as Webhook[]
}

interface CreateWebhookData {
  name: string
  url: string
  events: string[]
  headers?: Record<string, string>
}

export async function createWebhook(
  data: CreateWebhookData,
  userId: string
): Promise<Webhook> {
  const supabase = createAdminClient()
  const secret = crypto.randomBytes(32).toString('hex')

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .insert({
      name: data.name,
      url: data.url,
      events: data.events,
      headers: data.headers || {},
      secret,
      is_active: true,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating webhook:', error.message)
    throw new Error(error.message)
  }
  return webhook as Webhook
}

interface UpdateWebhookData {
  name?: string
  url?: string
  events?: string[]
  headers?: Record<string, string>
  is_active?: boolean
  secret?: string
}

export async function updateWebhook(
  id: string,
  data: UpdateWebhookData
): Promise<Webhook> {
  const supabase = createAdminClient()
  const { data: webhook, error } = await supabase
    .from('webhooks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating webhook:', error.message)
    throw new Error(error.message)
  }
  return webhook as Webhook
}

export async function deleteWebhook(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting webhook:', error.message)
    throw new Error(error.message)
  }
}

export async function updateWebhookStatus(
  id: string,
  statusCode: number,
  triggeredAt: Date
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('webhooks')
    .update({
      last_status_code: statusCode,
      last_triggered_at: triggeredAt.toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating webhook status:', error.message)
  }
}
