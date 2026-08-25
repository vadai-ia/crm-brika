import { withTechLog } from '@/lib/services/tech-log'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

// Todos los usuarios activos (incluidos admins) para el select de responsable.
async function _GET() {
  const auth = await requirePermission('anuncios.view')
  if (isAuthError(auth)) return auth

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true, nullsFirst: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data: data ?? [] })
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/anuncios/usuarios', _GET)
