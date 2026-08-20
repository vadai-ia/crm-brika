import { google } from 'googleapis'
import { getOAuth2Client } from './auth'

export interface Attendee {
  email: string
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
}

export interface ReminderOverride {
  method: 'popup'
  minutes: number
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  backgroundColor?: string
  borderColor?: string
  allDay: boolean
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  asesorName?: string
  asesorColor?: string
  attendees?: Attendee[]
  reminders?: ReminderOverride[]
}

export interface CalendarListItem {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

export async function getCalendarList(userId: string): Promise<CalendarListItem[]> {
  const { client } = await getOAuth2Client(userId)
  const cal = google.calendar({ version: 'v3', auth: client })
  const res = await cal.calendarList.list()
  return (res.data.items ?? []).map((item) => ({
    id: item.id!,
    summary: item.summary ?? 'Sin nombre',
    backgroundColor: item.backgroundColor ?? '#A31CDC',
    primary: item.primary ?? false,
  }))
}

export async function getEvents(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const { client, selectedCalendarId } = await getOAuth2Client(userId)
  const cal = google.calendar({ version: 'v3', auth: client })

  const res = await cal.events.list({
    calendarId: selectedCalendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })

  return (res.data.items ?? []).map((ev) => {
    const allDay = !!ev.start?.date
    const priv = (ev.extendedProperties?.private as Record<string, string> | undefined) ?? {}
    const catColor = priv.kibah_category_color || null

    const attendees: Attendee[] = (ev.attendees ?? []).map((a) => ({
      email: a.email!,
      responseStatus: (a.responseStatus as Attendee['responseStatus']) ?? 'needsAction',
    }))

    const reminders: ReminderOverride[] = ev.reminders?.useDefault === false
      ? (ev.reminders.overrides ?? []).map((o) => ({ method: 'popup' as const, minutes: o.minutes! }))
      : []

    return {
      id: ev.id!,
      title: ev.summary || '(Sin titulo)',
      start: allDay ? ev.start!.date! : ev.start!.dateTime!,
      end: allDay ? ev.end!.date! : ev.end!.dateTime!,
      description: ev.description ?? undefined,
      location: ev.location ?? undefined,
      backgroundColor: catColor || '#A31CDC',
      borderColor: catColor || '#A31CDC',
      allDay,
      categoryId: priv.kibah_category_id || undefined,
      categoryName: priv.kibah_category_name || undefined,
      categoryColor: catColor || undefined,
      attendees: attendees.length > 0 ? attendees : undefined,
      reminders: reminders.length > 0 ? reminders : undefined,
    }
  })
}

interface EventInput {
  title: string
  start: string
  end: string
  description?: string
  location?: string
  allDay?: boolean
  timeZone?: string
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  attendees?: string[]
  reminders?: ReminderOverride[]
}

export async function createEvent(
  userId: string,
  data: EventInput
): Promise<CalendarEvent> {
  const { client, selectedCalendarId } = await getOAuth2Client(userId)
  const cal = google.calendar({ version: 'v3', auth: client })

  const eventBody: Record<string, unknown> = {
    summary: data.title,
    description: data.description || undefined,
    location: data.location || undefined,
  }

  const tz = data.timeZone || 'America/Mexico_City'
  if (data.allDay) {
    eventBody.start = { date: data.start.split('T')[0] }
    eventBody.end = { date: data.end.split('T')[0] }
  } else {
    eventBody.start = { dateTime: data.start, timeZone: tz }
    eventBody.end = { dateTime: data.end, timeZone: tz }
  }

  if (data.categoryId) {
    eventBody.extendedProperties = {
      private: {
        kibah_category_id: data.categoryId,
        kibah_category_name: data.categoryName || '',
        kibah_category_color: data.categoryColor || '#A31CDC',
      },
    }
  }

  if (data.attendees && data.attendees.length > 0) {
    eventBody.attendees = data.attendees.map((email) => ({ email }))
  }

  if (data.reminders && data.reminders.length > 0) {
    eventBody.reminders = { useDefault: false, overrides: data.reminders }
  } else {
    eventBody.reminders = { useDefault: true }
  }

  const res = await cal.events.insert({
    calendarId: selectedCalendarId,
    requestBody: eventBody,
    sendUpdates: data.attendees?.length ? 'all' : 'none',
  })
  const ev = res.data
  const allDay = !!ev.start?.date
  return {
    id: ev.id!,
    title: ev.summary || data.title,
    start: allDay ? ev.start!.date! : ev.start!.dateTime!,
    end: allDay ? ev.end!.date! : ev.end!.dateTime!,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
    backgroundColor: data.categoryColor || '#A31CDC',
    borderColor: data.categoryColor || '#A31CDC',
    allDay,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    categoryColor: data.categoryColor,
  }
}

export async function updateEvent(
  userId: string,
  eventId: string,
  data: Partial<EventInput>
): Promise<CalendarEvent> {
  const { client, selectedCalendarId } = await getOAuth2Client(userId)
  const cal = google.calendar({ version: 'v3', auth: client })

  const eventBody: Record<string, unknown> = {}
  if (data.title !== undefined) eventBody.summary = data.title
  if (data.description !== undefined) eventBody.description = data.description
  if (data.location !== undefined) eventBody.location = data.location

  if (data.start && data.end) {
    const tz = data.timeZone || 'America/Mexico_City'
    if (data.allDay) {
      eventBody.start = { date: data.start.split('T')[0] }
      eventBody.end = { date: data.end.split('T')[0] }
    } else {
      eventBody.start = { dateTime: data.start, timeZone: tz }
      eventBody.end = { dateTime: data.end, timeZone: tz }
    }
  }

  if (data.categoryId !== undefined) {
    eventBody.extendedProperties = {
      private: {
        kibah_category_id: data.categoryId || '',
        kibah_category_name: data.categoryName || '',
        kibah_category_color: data.categoryColor || '',
      },
    }
  }

  if (data.attendees !== undefined) {
    eventBody.attendees = data.attendees.map((email) => ({ email }))
  }

  if (data.reminders !== undefined) {
    if (data.reminders.length > 0) {
      eventBody.reminders = { useDefault: false, overrides: data.reminders }
    } else {
      eventBody.reminders = { useDefault: true }
    }
  }

  const res = await cal.events.patch({
    calendarId: selectedCalendarId,
    eventId,
    requestBody: eventBody,
    sendUpdates: data.attendees?.length ? 'all' : 'none',
  })
  const ev = res.data
  const allDay = !!ev.start?.date
  const priv = (ev.extendedProperties?.private as Record<string, string> | undefined) ?? {}
  return {
    id: ev.id!,
    title: ev.summary || '(Sin titulo)',
    start: allDay ? ev.start!.date! : ev.start!.dateTime!,
    end: allDay ? ev.end!.date! : ev.end!.dateTime!,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
    backgroundColor: priv.kibah_category_color || '#A31CDC',
    allDay,
    categoryId: priv.kibah_category_id || undefined,
    categoryName: priv.kibah_category_name || undefined,
    categoryColor: priv.kibah_category_color || undefined,
  }
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const { client, selectedCalendarId } = await getOAuth2Client(userId)
  const cal = google.calendar({ version: 'v3', auth: client })
  await cal.events.delete({ calendarId: selectedCalendarId, eventId })
}
