import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent } from '@/lib/google/calendar'
import { upsertInvitedContacts } from '@/lib/dal/invited-contacts'

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
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
