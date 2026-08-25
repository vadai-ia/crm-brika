import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import { z, ZodError } from 'zod'
import { requireAnyPermission, isAuthError } from '@/lib/auth/permissions'
import { syncStep } from '@/lib/services/photo-sync/sync'

export const dynamic = 'force-dynamic'
// Cada paso importa una sola foto (descarga + optimiza + sube), pero los
// originales pueden pesar 15 MB: pedir el máximo que permita el plan.
export const maxDuration = 60

const bodySchema = z.object({ setId: z.number().int().positive() })

/** Avanza un paso la importación del set (una foto por llamada; `done` cuando termina). */
async function _POST(request: NextRequest) {
  const auth = await requireAnyPermission(['propiedades.view', 'pdf.view'])
  if (isAuthError(auth)) return auth

  const body = await request.json().catch(() => null)
  if (body === null) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  try {
    const { setId } = bodySchema.parse(body)
    const data = await syncStep(setId)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Error al importar fotos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const POST = withTechLog('/api/fotos/sync', _POST, { level: 'errors' })
