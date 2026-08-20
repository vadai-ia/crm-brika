'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

const ASESOR_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EC4899', '#06B6D4', '#F97316', '#EF4444',
]
const ADMIN_COLOR = '#6B7280'

interface ConnectedUser {
  userId: string
  fullName: string
  calendarEmail: string | null
}

interface AsesorFilterProps {
  adminUserId: string
  selectedUserIds: Set<string>
  onToggle: (userId: string) => void
  hideSelf?: boolean
}

export function AsesorFilter({ adminUserId, selectedUserIds, onToggle, hideSelf }: AsesorFilterProps) {
  const [users, setUsers] = useState<ConnectedUser[]>([])

  useEffect(() => {
    fetch('/api/calendar/admin/asesores')
      .then((r) => r.json())
      .then((data) => setUsers(data.data ?? []))
      .catch(() => {})
  }, [])

  const asesores = users.filter((u) => u.userId !== adminUserId)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!hideSelf && (
        <button
          onClick={() => onToggle(adminUserId)}
          className={`h-7 px-2.5 text-[11px] font-medium rounded-full border transition-colors cursor-pointer flex items-center gap-1.5
            ${selectedUserIds.has(adminUserId) ? 'border-[#6B7280]/40 bg-[#6B7280]/10 text-[#6B7280]' : 'border-border-primary text-text-tertiary opacity-50'}`}
        >
          {selectedUserIds.has(adminUserId) && <Check className="w-3 h-3" strokeWidth={2} />}
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ADMIN_COLOR }} />
          Mis eventos
        </button>
      )}

      {/* Asesores */}
      {asesores.map((u, idx) => {
        const color = ASESOR_COLORS[idx % ASESOR_COLORS.length]
        const active = selectedUserIds.has(u.userId)
        return (
          <button
            key={u.userId}
            onClick={() => onToggle(u.userId)}
            className={`h-7 px-2.5 text-[11px] font-medium rounded-full border transition-colors cursor-pointer flex items-center gap-1.5
              ${active ? '' : 'border-border-primary text-text-tertiary opacity-50'}`}
            style={active ? { borderColor: `${color}60`, backgroundColor: `${color}15`, color } : undefined}
          >
            {active && <Check className="w-3 h-3" strokeWidth={2} />}
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {u.fullName}
          </button>
        )
      })}
    </div>
  )
}
