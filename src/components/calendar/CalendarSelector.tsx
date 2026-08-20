'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface CalendarItem {
  id: string
  summary: string
  backgroundColor: string
  primary: boolean
}

interface CalendarSelectorProps {
  onSelect: () => void
}

export function CalendarSelector({ onSelect }: CalendarSelectorProps) {
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/calendar/list')
      .then((r) => r.json())
      .then((data) => {
        const items = data.data ?? []
        setCalendars(items)
        const primary = items.find((c: CalendarItem) => c.primary)
        if (primary) setSelected(primary.id)
        else if (items.length > 0) setSelected(items[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!selected) return
    const cal = calendars.find((c) => c.id === selected)
    if (!cal) return

    setSaving(true)
    try {
      const res = await fetch('/api/calendar/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: cal.id, calendarName: cal.summary }),
      })
      if (res.ok) {
        onSelect()
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-md shadow-2xl mx-4 p-6">
        <h2 className="text-base font-semibold text-text-primary mb-1">Elige tu calendario</h2>
        <p className="text-xs text-text-secondary mb-4">Selecciona el calendario de Google que quieres usar</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" strokeWidth={1.5} />
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {calendars.map((cal) => (
              <button
                key={cal.id}
                onClick={() => setSelected(cal.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] border text-left transition-colors cursor-pointer
                  ${selected === cal.id ? 'border-orange bg-orange/5' : 'border-border-primary hover:bg-bg-tertiary'}`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.backgroundColor }} />
                <span className="text-sm text-text-primary flex-1 truncate">{cal.summary}</span>
                {cal.primary && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange/15 text-orange flex-shrink-0">Principal</span>
                )}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!selected || saving || loading}
          className="w-full h-9 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving ? 'Guardando...' : 'Usar este calendario'}
        </button>
      </div>
    </div>
  )
}
