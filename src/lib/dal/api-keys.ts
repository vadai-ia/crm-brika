import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiKey } from '@/types'

export async function getApiKeys(): Promise<Omit<ApiKey, 'key_hash' | 'key_salt'>[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, permissions, is_active, last_used_at, expires_at, created_at, created_by')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching api keys:', error.message)
    throw new Error(error.message)
  }
  return data as Omit<ApiKey, 'key_hash' | 'key_salt'>[]
}

interface CreateApiKeyData {
  name: string
  permissions: string[]
  expires_at?: string | null
}

export async function createApiKey(
  data: CreateApiKeyData,
  keyHash: string,
  keySalt: string,
  keyPrefix: string,
  userId: string
): Promise<ApiKey> {
  const supabase = createAdminClient()
  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .insert({
      name: data.name,
      key_hash: keyHash,
      key_salt: keySalt,
      key_prefix: keyPrefix,
      permissions: data.permissions,
      is_active: true,
      expires_at: data.expires_at || null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating api key:', error.message)
    throw new Error(error.message)
  }
  return apiKey as ApiKey
}

export async function revokeApiKey(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error revoking api key:', error.message)
    throw new Error(error.message)
  }
}

export async function getAllActiveApiKeys(): Promise<ApiKey[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching active api keys:', error.message)
    return []
  }
  return data as ApiKey[]
}

export async function updateLastUsed(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error updating last used:', error.message)
  }
}
