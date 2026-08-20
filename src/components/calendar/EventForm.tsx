'use client'

import { useEffect, useState } from 'react'
import { X, Plus, Mail, Bell } from 'lucide-react'
import type { CalendarEvent, ReminderOverride } from '@/lib/google/calendar'

interface Category {
  id: string
  name: string
  color: string
}

const QUICK_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444', '#F97316', '#6B7280', '#212121', '#84CC16', '#A31CDC']

const REMINDER_OPTIONS = [
  { label: '5 min antes', minutes: 5 },
  { label: '10 min antes', minutes: 10 },
  { label: '15 min antes', minutes: 15 },
  { label: '30 min antes', minutes: 30 },
  { label: '1 hora antes', minutes: 60 },
  { label: '2 horas antes', minutes: 120 },
  { label: '1 día antes', minutes: 1440 },
  { label: '2 días antes', minutes: 2880 },
]

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function addOneHour(time: string, date: string): { time: string; date: string } {
  const [h, m] = time.split(':').map(Number)
  const newH = h + 1
  if (newH >= 24) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    return { time: `${String(newH - 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`, date: d.toISOString().split('T')[0] }
  }
  return { time: `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`, date }
}

interface EventFormProps {
  event?: CalendarEvent | null
  defaultStart?: string
  defaultEnd?: string
  onClose: () => void
  onSaved: () => void
  onToast: (msg: string, type: 'success' | 'error') => void
}

export function EventForm({ event, defaultStart, defaultEnd, onClose, onSaved, onToast }: EventFormProps) {
  const isEdit = !!event
  const [title, setTitle] = useState(event?.title === '(Sin titulo)' ? '' : event?.title ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startDate, setStartDate] = useState(() => (event?.start || defaultStart || '').split('T')[0] || '')
  const [startTime, setStartTime] = useState(() => {
    const s = event?.start || defaultStart || ''
    return s.includes('T') ? s.split('T')[1]?.slice(0, 5) || '09:00' : '09:00'
  })
  const [endDate, setEndDate] = useState(() => {
    if (event?.end) return event.end.split('T')[0]
    // For new events: compute start + 1hr
    const initStart = (defaultStart || '').split('T')[0] || startDate
    const initTime = (() => {
      const s = defaultStart || ''
      return s.includes('T') ? s.split('T')[1]?.slice(0, 5) || '09:00' : '09:00'
    })()
    return addOneHour(initTime, initStart).date
  })
  const [endTime, setEndTime] = useState(() => {
    if (event?.end && event.end.includes('T')) return event.end.split('T')[1]?.slice(0, 5) || '10:00'
    // For new events: start time + 1hr
    const s = defaultStart || ''
    const initTime = s.includes('T') ? s.split('T')[1]?.slice(0, 5) || '09:00' : '09:00'
    return addOneHour(initTime, startDate).time
  })
  const [description, setDescription] = useState(event?.description ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [submitting, setSubmitting] = useState(false)

  // Attendees
  const [attendees, setAttendees] = useState<string[]>(event?.attendees?.map((a) => a.email) ?? [])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    if (!showSuggestions) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/api/calendar/invited-contacts?q=${encodeURIComponent(attendeeInput.trim())}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((json) => {
          const emails = (json.data ?? []).map((c: { email: string }) => c.email)
          setSuggestions(emails.filter((e: string) => !attendees.includes(e)))
        })
        .catch(() => {})
    }, 150)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [attendeeInput, attendees, showSuggestions])

  // Reminders
  const [reminders, setReminders] = useState<ReminderOverride[]>(
    event?.reminders && event.reminders.length > 0
      ? event.reminders
      : [{ method: 'popup', minutes: 30 }]
  )

  const [endManuallySet, setEndManuallySet] = useState(isEdit)
  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime)
    if (!endManuallySet && startDate) {
      const result = addOneHour(newTime, startDate)
      setEndTime(result.time)
      setEndDate(result.date)
    }
  }

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCatId, setSelectedCatId] = useState(event?.categoryId ?? '')
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(QUICK_COLORS[0])

  useEffect(() => {
    fetch('/api/calendar/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.data ?? []))
      .catch(() => {})
  }, [])

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    try {
      const res = await fetch('/api/calendar/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }),
      })
      if (res.ok) {
        const json = await res.json()
        setCategories((prev) => [...prev, json.data])
        setSelectedCatId(json.data.id)
        setNewCatName('')
        setShowNewCat(false)
      } else {
        const body = await res.json().catch(() => ({}))
        onToast(body.error || 'Error al crear categoria', 'error')
      }
    } catch {
      onToast('Error de conexion', 'error')
    }
  }

  const addAttendee = () => {
    const email = attendeeInput.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) { onToast('Email no válido', 'error'); return }
    if (attendees.includes(email)) { onToast('Ya está en la lista', 'error'); return }
    setAttendees((prev) => [...prev, email])
    setAttendeeInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { onToast('Titulo es requerido', 'error'); return }
    if (!startDate) { onToast('Fecha de inicio es requerida', 'error'); return }

    setSubmitting(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const cat = categories.find((c) => c.id === selectedCatId)

    const payload: Record<string, unknown> = {
      title: title.trim(),
      allDay,
      start: allDay ? startDate : `${startDate}T${startTime}:00`,
      end: allDay ? (endDate || startDate) : `${endDate || startDate}T${endTime}:00`,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      timeZone: tz,
      attendees: attendees.length > 0 ? attendees : undefined,
      reminders: reminders,
    }
    if (cat) {
      payload.categoryId = cat.id
      payload.categoryName = cat.name
      payload.categoryColor = cat.color
    }

    const url = isEdit ? `/api/calendar/events/${event!.id}` : '/api/calendar/events'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        onToast(body.error || 'Error al guardar', 'error')
        return
      }
      onToast(isEdit ? 'Evento actualizado' : 'Evento creado', 'success')
      onSaved()
      onClose()
    } catch {
      onToast('Error de conexion', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const ic = 'w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary focus:outline-none focus:border-orange focus:ring-1 focus:ring-orange/30'

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto flex items-start justify-center">
        <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-xl shadow-2xl my-8 mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
            <h2 className="text-base font-semibold text-text-primary">{isEdit ? 'Editar Evento' : 'Nuevo Evento'}</h2>
            <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary"><X className="w-5 h-5" strokeWidth={1.5} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Titulo *</label>
              <input className={ic} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del evento" />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Categoria</label>
              {categories.length === 0 && !showNewCat ? (
                <p className="text-xs text-text-tertiary mb-2">Crea tu primera categoria. Ideas: Reunion, Llamada, Capacitacion, Visita, Personal...</p>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <button type="button" onClick={() => setSelectedCatId('')}
                    className={`h-7 px-2.5 text-[11px] font-medium rounded-full border cursor-pointer transition-colors
                      ${!selectedCatId ? 'border-orange bg-orange/10 text-orange' : 'border-border-primary text-text-tertiary'}`}>
                    Sin categoria
                  </button>
                  {categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => setSelectedCatId(cat.id)}
                      className="h-7 px-2.5 text-[11px] font-medium rounded-full border cursor-pointer transition-colors flex items-center gap-1"
                      style={selectedCatId === cat.id
                        ? { borderColor: cat.color, backgroundColor: `${cat.color}18`, color: cat.color }
                        : undefined
                      }>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {showNewCat ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-shrink-0">
                    {QUICK_COLORS.map((c) => (
                      <button key={c} type="button" onClick={() => setNewCatColor(c)}
                        className={`w-4 h-4 rounded-full cursor-pointer ${newCatColor === c ? 'ring-2 ring-offset-1 ring-offset-bg-primary' : ''}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nombre"
                    className="flex-1 h-7 px-2 text-xs rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary focus:outline-none focus:border-orange" />
                  <button type="button" onClick={handleCreateCategory} className="text-xs text-orange hover:text-orange-hover cursor-pointer font-medium">OK</button>
                  <button type="button" onClick={() => setShowNewCat(false)} className="text-xs text-text-tertiary cursor-pointer">X</button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowNewCat(true)}
                  className="flex items-center gap-1 text-xs text-orange hover:text-orange-hover cursor-pointer">
                  <Plus className="w-3 h-3" strokeWidth={2} /> Nueva categoria
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAllDay(!allDay)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${allDay ? 'bg-orange' : 'bg-bg-tertiary border border-border-primary'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${allDay ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-text-secondary">Todo el dia</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Fecha inicio *</label>
                <input type="date" className={ic} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              {!allDay && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Hora inicio</label>
                  <input type="time" className={ic} value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Fecha fin</label>
                <input type="date" className={ic} value={endDate} onChange={(e) => { setEndDate(e.target.value); setEndManuallySet(true) }} />
              </div>
              {!allDay && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Hora fin</label>
                  <input type="time" className={ic} value={endTime} onChange={(e) => { setEndTime(e.target.value); setEndManuallySet(true) }} />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Descripcion</label>
              <textarea className={`${ic} h-20 py-2 resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Ubicacion</label>
              <input className={ic} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" strokeWidth={1.5} /> Invitados
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    className={ic}
                    value={attendeeInput}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onChange={(e) => { setAttendeeInput(e.target.value); setShowSuggestions(true) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } }}
                    placeholder="correo@ejemplo.com"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-bg-primary border border-border-primary rounded-[var(--radius-sm)] shadow-xl max-h-48 overflow-y-auto">
                      {suggestions.map((email) => (
                        <button
                          key={email}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setAttendees((prev) => [...prev, email])
                            setAttendeeInput('')
                            setShowSuggestions(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={addAttendee} className="h-9 px-3 text-xs font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer">Agregar</button>
              </div>
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {attendees.map((email) => (
                    <span key={email} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange/10 text-orange border border-orange/20">
                      {email}
                      <button type="button" onClick={() => setAttendees((prev) => prev.filter((e) => e !== email))} className="hover:text-orange-hover cursor-pointer">
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reminders */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                <Bell className="w-3 h-3" strokeWidth={1.5} /> Recordatorios
              </label>
              <div className="space-y-1.5">
                {reminders.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={r.minutes}
                      onChange={(e) => {
                        const mins = Number(e.target.value)
                        setReminders((prev) => prev.map((rem, idx) => idx === i ? { method: 'popup', minutes: mins } : rem))
                      }}
                      className="h-8 px-2 text-xs rounded-[var(--radius-sm)] border border-border-primary bg-bg-primary text-text-primary cursor-pointer focus:outline-none focus:border-orange"
                    >
                      {REMINDER_OPTIONS.map((opt) => (
                        <option key={opt.minutes} value={opt.minutes}>{opt.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setReminders((prev) => prev.filter((_, idx) => idx !== i))} className="text-text-tertiary hover:text-red-500 cursor-pointer">
                      <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
                {reminders.length < 5 && (
                  <button type="button" onClick={() => setReminders((prev) => [...prev, { method: 'popup', minutes: 30 }])}
                    className="flex items-center gap-1 text-xs text-orange hover:text-orange-hover cursor-pointer">
                    <Plus className="w-3 h-3" strokeWidth={2} /> Agregar recordatorio
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
              <button type="button" onClick={onClose} className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" disabled={submitting} className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer">
                {submitting ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear Evento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
