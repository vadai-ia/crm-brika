import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { extractPropertyFromPdf, PdfExtractError } from '@/lib/services/pdf-extract-service'
import { PDF_EXTRACT_MAX_BYTES, ROLE_ADMIN } from '@/lib/utils/constants'

// La lectura del PDF con IA puede tardar varios segundos.
export const maxDuration = 60

const fileSchema = z.object({
  type: z.literal('application/pdf', { message: 'El archivo debe ser un PDF' }),
  size: z.number().max(PDF_EXTRACT_MAX_BYTES, { message: 'El PDF no puede pesar más de 4 MB' }),
})

async function _POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Mismo permiso que crear propiedades (POST /api/properties)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== ROLE_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Adjunta un archivo PDF' }, { status: 400 })
  }

  const check = fileSchema.safeParse({ type: file.type, size: file.size })
  if (!check.success) {
    return NextResponse.json({ error: check.error.issues[0].message }, { status: 400 })
  }

  try {
    const fields = await extractPropertyFromPdf(Buffer.from(await file.arrayBuffer()))
    return NextResponse.json({ fields })
  } catch (err) {
    if (err instanceof PdfExtractError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[extract-pdf]', err)
    return NextResponse.json({ error: 'Error al procesar el PDF' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34)
export const POST = withTechLog('/api/properties/extract-pdf', _POST)
