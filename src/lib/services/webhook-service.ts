import crypto from 'crypto'
import * as dal from '@/lib/dal/webhooks'

function computeSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export async function triggerEvent(
  event: string,
  data: unknown
): Promise<void> {
  const webhooks = await dal.getActiveWebhooksByEvent(event)
  if (webhooks.length === 0) return

  const payload = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  })

  await Promise.allSettled(
    webhooks.map(async (webhook) => {
      const signature = computeSignature(payload, webhook.secret ?? '')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const customHeaders = (webhook.headers && typeof webhook.headers === 'object')
          ? webhook.headers as Record<string, string>
          : {}

        const res = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            ...customHeaders,
          },
          body: payload,
          signal: controller.signal,
        })

        await dal.updateWebhookStatus(webhook.id, res.status, new Date())
      } catch (err) {
        console.error(`Webhook ${webhook.id} (${webhook.name}) failed:`, err)
        await dal.updateWebhookStatus(webhook.id, 0, new Date())
      } finally {
        clearTimeout(timeout)
      }
    })
  )
}

export async function testWebhook(
  webhookId: string
): Promise<{ success: boolean; statusCode: number; error?: string }> {
  const webhook = await dal.getWebhookById(webhookId)
  if (!webhook) {
    return { success: false, statusCode: 0, error: 'Webhook no encontrado' }
  }

  const payload = JSON.stringify({
    event: 'test',
    data: { message: 'Webhook test from BRIKA' },
    timestamp: new Date().toISOString(),
  })

  const signature = computeSignature(payload, webhook.secret ?? '')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const customHeaders = (webhook.headers && typeof webhook.headers === 'object')
      ? webhook.headers as Record<string, string>
      : {}

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        ...customHeaders,
      },
      body: payload,
      signal: controller.signal,
    })

    await dal.updateWebhookStatus(webhook.id, res.status, new Date())
    return { success: res.ok, statusCode: res.status }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await dal.updateWebhookStatus(webhook.id, 0, new Date())
    return { success: false, statusCode: 0, error: message }
  } finally {
    clearTimeout(timeout)
  }
}
