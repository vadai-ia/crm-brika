import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/lib/google/calendar'
import { upsertInvitedContacts } from '@/lib/dal/invited-contacts'

async function _GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const start = params.get('start')
  const end = params.get('end')
  if (!start || !end) return NextResponse.json({ error: 'start and end required' }, { status: 400 })

  try {
    const events = await getEvents(user.id, start, end)
    return NextResponse.json({ data: events })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

async function _POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    if (!body.title || !body.start || !body.end) {
      return NextResponse.json({ error: 'title, start, end required' }, { status: 400 })
    }
    const event = await createEvent(user.id, body)
    if (Array.isArray(body.attendees) && body.attendees.length > 0) {
      await upsertInvitedContacts(user.id, body.attendees).catch(() => {})
    }
    return NextResponse.json({ data: event }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const GET = withTechLog('/api/calendar/events', _GET)
export const POST = withTechLog('/api/calendar/events', _POST)
