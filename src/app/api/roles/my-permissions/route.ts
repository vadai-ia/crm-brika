import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserPermissions } from '@/lib/dal/roles'

async function _GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const permissions = await getUserPermissions(user.id)
    return NextResponse.json({ permissions })
  } catch {
    return NextResponse.json({ permissions: {} })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/roles/my-permissions', _GET, { level: 'errors' })
