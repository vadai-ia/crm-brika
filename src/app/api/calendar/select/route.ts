import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateSelectedCalendar } from '@/lib/dal/google-tokens'

export async function POST(request: NextRequest) {
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
