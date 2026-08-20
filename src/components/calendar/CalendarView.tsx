'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { CalendarEvent } from '@/lib/google/calendar'
import { EventForm } from './EventForm'
import { EventDetail } from './EventDetail'
import { CategoryFilter } from './CategoryFilter'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import '@/styles/calendar.css'

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false })
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

interface CalendarViewProps {
  mode?: 'personal' | 'admin'
  asesorUserId?: string
  selectedUserIds?: string
  excludeUserId?: string
}

export function CalendarView({ mode = 'personal', asesorUserId, selectedUserIds, excludeUserId }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [defaultStart, setDefaultStart] = useState<string>('')
  const [defaultEnd, setDefaultEnd] = useState<string>('')
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set())
  const rangeRef = useRef<{ start: string; end: string } | null>(null)

  const showToast = useCallback((msg: string, type: ToastType) => setToast({ message: msg, type }), [])

  const fetchEvents = useCallback(async (start: string, end: string) => {
    setLoading(true)
    try {
      let url: string
      if (mode === 'admin') {
        url = `/api/calendar/admin/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        if (selectedUserIds) url += `&userIds=${encodeURIComponent(selectedUserIds)}`
        else if (asesorUserId) url += `&userId=${encodeURIComponent(asesorUserId)}`
        if (excludeUserId) url += `&excludeUserId=${encodeURIComponent(excludeUserId)}`
      } else {
        url = `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      }
      const res = await fetch(url)
      if (res.ok) { const json = await res.json(); setEvents(json.data ?? []) }
    } catch {} finally { setLoading(false) }
  }, [mode, asesorUserId, selectedUserIds, excludeUserId])

  const refetchEvents = useCallback(() => {
    if (rangeRef.current) fetchEvents(rangeRef.current.start, rangeRef.current.end)
  }, [fetchEvents])

  const prevFilterRef = useRef(asesorUserId + '|' + selectedUserIds + '|' + excludeUserId)
  const currentFilter = asesorUserId + '|' + selectedUserIds + '|' + excludeUserId
  if (prevFilterRef.current !== currentFilter) {
    prevFilterRef.current = currentFilter
    if (rangeRef.current) fetchEvents(rangeRef.current.start, rangeRef.current.end)
  }

  const handleDatesSet = useCallback((info: { startStr: string; endStr: string }) => {
    rangeRef.current = { start: info.startStr, end: info.endStr }
    fetchEvents(info.startStr, info.endStr)
  }, [fetchEvents])

  const handleDateClick = useCallback((info: { dateStr: string }) => {
    if (mode === 'admin') return
    setEditingEvent(null)
    setDefaultStart(info.dateStr)
    const end = new Date(info.dateStr)
    end.setHours(end.getHours() + 1)
    setDefaultEnd(end.toISOString())
    setFormOpen(true)
  }, [mode])

  const handleEventClick = useCallback((info: { event: { id: string } }) => {
    const ev = events.find((e) => e.id === info.event.id)
    if (ev) setSelectedEvent(ev)
  }, [events])

  const handleEventDrop = useCallback(async (info: { event: { id: string; startStr: string; endStr: string; allDay: boolean } }) => {
    if (mode === 'admin') return
    try {
      await fetch(`/api/calendar/events/${info.event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: info.event.startStr, end: info.event.endStr, allDay: info.event.allDay, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      })
      refetchEvents()
    } catch { showToast('Error al mover evento', 'error') }
  }, [mode, refetchEvents, showToast])

  const handleDelete = useCallback(async () => {
    if (!deletingEvent) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/calendar/events/${deletingEvent.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) { showToast('Evento eliminado', 'success'); setDeletingEvent(null); refetchEvents() }
      else showToast('Error al eliminar', 'error')
    } catch { showToast('Error de conexion', 'error') }
    finally { setDeleteLoading(false) }
  }, [deletingEvent, refetchEvents, showToast])

  const toggleCategory = useCallback((catId: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  const filteredEvents = useMemo(() => {
    if (mode === 'admin' || hiddenCategories.size === 0) return events
    return events.filter((ev) => {
      const catId = ev.categoryId || '__none__'
      return !hiddenCategories.has(catId)
    })
  }, [events, hiddenCategories, mode])

  const isPersonal = mode === 'personal'

  return (
    <div className="relative space-y-3">
      {isPersonal && (
        <CategoryFilter hiddenCategories={hiddenCategories} onToggle={toggleCategory} onManagerChanged={refetchEvents} />
      )}

      {loading && (
        <div className="absolute top-2 right-2 z-10">
          <Loader2 className="w-5 h-5 text-orange animate-spin" strokeWidth={1.5} />
        </div>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        locale="es"
        buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'D\u00eda' }}
        nowIndicator={true}
        allDaySlot={true}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        expandRows={true}
        stickyHeaderDates={true}
        dayMaxEvents={3}
        selectMirror={true}
        events={filteredEvents}
        editable={isPersonal}
        selectable={isPersonal}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventDrop}
        datesSet={handleDatesSet}
        height="calc(100vh - 200px)"
      />

      {formOpen && isPersonal && (
        <EventForm event={editingEvent} defaultStart={defaultStart} defaultEnd={defaultEnd} onClose={() => setFormOpen(false)} onSaved={refetchEvents} onToast={showToast} />
      )}

      {selectedEvent && (
        <EventDetail event={selectedEvent} onClose={() => setSelectedEvent(null)}
          onEdit={(ev) => { if (!isPersonal) return; setSelectedEvent(null); setEditingEvent(ev); setFormOpen(true) }}
          onDelete={(ev) => { if (!isPersonal) return; setSelectedEvent(null); setDeletingEvent(ev) }} />
      )}

      {deletingEvent && isPersonal && (
        <ConfirmDialog title="Eliminar Evento" message={`Eliminar "${deletingEvent.title}"?`} confirmLabel="Eliminar" variant="danger" loading={deleteLoading} onConfirm={handleDelete} onCancel={() => setDeletingEvent(null)} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
