import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateSelectedCalendar } from '@/lib/dal/google-tokens'

async function _POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { calendarId, calendarName } = body
    if (!calendarId) return NextResponse.json({ error: 'calendarId required' }, { status: 400 })
    await updateSelectedCalendar(user.id, calendarId, calendarName || calendarId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const POST = withTechLog('/api/calendar/select', _POST)
