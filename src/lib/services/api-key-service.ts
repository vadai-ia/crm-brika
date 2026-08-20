import crypto from 'crypto'
import * as dal from '@/lib/dal/api-keys'
import type { ApiKey } from '@/types'
import type { CreateApiKeyInput } from '@/lib/validations/api-key'

export async function generateApiKey(data: CreateApiKeyInput, userId: string) {
  const key = `kb_live_${crypto.randomBytes(32).toString('hex')}`
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHash('sha256').update(salt + key).digest('hex')
  const prefix = key.substring(0, 16)

  const apiKey = await dal.createApiKey(data, hash, salt, prefix, userId)
  return { ...apiKey, plaintext_key: key }
}

export async function validateApiKey(
  key: string
): Promise<ApiKey | null> {
  const activeKeys = await dal.getAllActiveApiKeys()

  for (const apiKey of activeKeys) {
    const hash = crypto.createHash('sha256').update(apiKey.key_salt + key).digest('hex')
    if (hash === apiKey.key_hash) {
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        return null
      }
      dal.updateLastUsed(apiKey.id).catch(console.error)
      return apiKey
    }
  }

  return null
}

// In-memory rate limiter (resets on cold start — fine for MVP)
const rateLimits = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(apiKeyId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(apiKeyId)

  if (!entry || now >= entry.resetAt) {
    rateLimits.set(apiKeyId, { count: 1, resetAt: now + 60000 })
    return true
  }

  if (entry.count >= 100) {
    return false
  }

  entry.count++
  return true
}
