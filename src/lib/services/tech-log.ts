// Logs técnicos: envoltorio para las API routes que registra en
// public.technical_logs (sql/011) método, ruta, status HTTP, duración y
// mensaje de error de cada request que valga la pena guardar.
//
// Qué se registra (para no inflar la tabla):
//   · SIEMPRE los errores (status >= 400), con el mensaje del body
//   · las escrituras (POST/PUT/PATCH/DELETE) con status y duración
//   · los requests lentos (> SLOW_REQUEST_MS) aunque sean GET
//   · con { level: 'errors' } (rutas de altísima frecuencia): solo errores
// NUNCA se registran cuerpos de request (ahí viajan contraseñas y llaves).
// Un fallo del log jamás afecta la respuesta al usuario.

import { createClient } from '@/lib/supabase/server'
import { insertTechLog, SLOW_REQUEST_MS } from '@/lib/dal/technical-logs'

type TechLogLevel = 'all' | 'errors'

interface TechLogOptions {
  /** 'errors': registra solo status >= 400 (rutas de altísima frecuencia). */
  level?: TechLogLevel
}

function shouldLog(method: string, status: number, durationMs: number, level: TechLogLevel): boolean {
  if (status >= 400) return true
  if (level === 'errors') return false
  if (method !== 'GET') return true
  return durationMs >= SLOW_REQUEST_MS
}

function pathOf(request: Request | undefined, fallback: string): string {
  if (!request) return fallback
  try {
    return new URL(request.url).pathname
  } catch {
    return fallback
  }
}

/** Mensaje de error del body JSON de la respuesta ({ error }), si lo hay. */
async function errorFromResponse(res: Response): Promise<string | null> {
  if (res.status < 400) return null
  try {
    const body = (await res.clone().json()) as { error?: unknown } | null
    return body && typeof body.error === 'string' ? body.error : null
  } catch {
    return null
  }
}

interface RecordParams {
  method: string
  route: string
  path: string
  status: number
  durationMs: number
  error: string | null
}

async function recordTechLog(params: RecordParams): Promise<void> {
  // Durante `next build` se ejecutan algunos GET sin sesión (401): no son
  // requests reales y meterían ruido en cada deploy.
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  try {
    let userId: string | null = null
    let userEmail: string | null = null
    try {
      // getSession lee la cookie sin ir a la red: suficiente para etiquetar el log
      const supabase = await createClient()
      const { data } = await supabase.auth.getSession()
      userId = data.session?.user?.id ?? null
      userEmail = data.session?.user?.email ?? null
    } catch {
      // rutas sin sesión (p. ej. el callback de Google): se registra sin usuario
    }
    await insertTechLog({
      method: params.method,
      route: params.route,
      path: params.path,
      status: params.status,
      duration_ms: params.durationMs,
      user_id: userId,
      user_email: userEmail,
      error: params.error ? params.error.slice(0, 2000) : null,
    })
  } catch (err) {
    console.error('tech log:', err instanceof Error ? err.message : err)
  }
}

/**
 * Envuelve un handler de API route para registrarlo en los logs técnicos.
 * Uso: `export const POST = withTechLog('/api/webhooks', _POST)`.
 */
export function withTechLog<A extends unknown[], R extends Response>(
  route: string,
  handler: (...args: A) => Promise<R> | R,
  opts: TechLogOptions = {}
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    const start = Date.now()
    const request = args[0] as Request | undefined
    const method = request?.method ?? 'GET'
    const path = pathOf(request, route)
    try {
      const res = await handler(...args)
      const durationMs = Date.now() - start
      if (shouldLog(method, res.status, durationMs, opts.level ?? 'all')) {
        await recordTechLog({
          method,
          route,
          path,
          status: res.status,
          durationMs,
          error: await errorFromResponse(res),
        })
      }
      return res
    } catch (err) {
      // Excepción no controlada: Next responderá 500; se registra y se relanza
      await recordTechLog({
        method,
        route,
        path,
        status: 500,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  }
}
