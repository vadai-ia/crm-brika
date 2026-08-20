import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCalendarList } from '@/lib/google/calendar'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const calendars = await getCalendarList(user.id)
    return NextResponse.json({ data: calendars })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
