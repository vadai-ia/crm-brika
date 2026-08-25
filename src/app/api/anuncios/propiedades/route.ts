import { withTechLog } from '@/lib/services/tech-log'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { INVENTARIO_TABLE } from '@/lib/utils/inventario'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

// Catálogo ligero (id + etiqueta) para ligar una nota a una propiedad.
async function _GET() {
  const auth = await requirePermission('anuncios.view')
  if (isAuthError(auth)) return auth

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from(INVENTARIO_TABLE)
    .select('id, parque, unidad')
    .order('parque', { ascending: true, nullsFirst: false })
    .limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const items = (data ?? []).map((p) => ({
    id: p.id as string,
    label: [p.parque, p.unidad].filter(Boolean).join(' · ') || (p.id as string),
  }))
  return NextResponse.json({ data: items })
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/anuncios/propiedades', _GET)
