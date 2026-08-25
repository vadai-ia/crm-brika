import { withTechLog } from '@/lib/services/tech-log'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateEvent, deleteEvent } from '@/lib/google/calendar'
import { upsertInvitedContacts } from '@/lib/dal/invited-contacts'

async function _PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await params
  try {
    const body = await request.json()
    const event = await updateEvent(user.id, eventId, body)
    if (Array.isArray(body.attendees) && body.attendees.length > 0) {
      await upsertInvitedContacts(user.id, body.attendees).catch(() => {})
    }
    return NextResponse.json({ data: event })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

async function _DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await params
  try {
    await deleteEvent(user.id, eventId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}

// Logs técnicos (ERROR-JOURNAL #34): registra status, duración y errores del request
export const PUT = withTechLog('/api/calendar/events/[eventId]', _PUT)
export const DELETE = withTechLog('/api/calendar/events/[eventId]', _DELETE)
