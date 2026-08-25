import { withTechLog } from '@/lib/services/tech-log'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchInvitedContacts } from '@/lib/dal/invited-contacts'

async function _GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const query = request.nextUrl.searchParams.get('q') ?? ''
  const data = await searchInvitedContacts(user.id, query, 10)
  return NextResponse.json({ data })
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/calendar/invited-contacts', _GET)
