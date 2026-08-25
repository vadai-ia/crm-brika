import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { deleteTokens } from '@/lib/dal/google-tokens'

async function _POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteTokens(user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const POST = withTechLog('/api/google/disconnect', _POST)
