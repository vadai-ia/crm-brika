'use client'

import { Building2, CalendarClock, Check, Circle, Pencil, Trash2, User } from 'lucide-react'
import type { Nota } from '@/lib/dal/anuncios'

interface NotaCardProps {
  nota: Nota
  meId: string
  isAdmin: boolean
  onToggle: (nota: Nota) => void
  onEdit: (nota: Nota) => void
  onDelete: (nota: Nota) => void
}

// after_date guarda la fecha límite sugerida ("preferible hacer antes de").
// Es 'YYYY-MM-DD': parsear como fecha local para no correrse un día
function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function fmtDate(d: string): string {
  return parseDate(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function NotaCard({ nota, meId, isAdmin, onToggle, onEdit, onDelete }: NotaCardProps) {
  const canEdit = isAdmin || nota.id_creador === meId
  const canToggle = canEdit || nota.id_responsable === meId
  const completada = nota.completada === true
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const vencida = !completada && !!nota.after_date && parseDate(nota.after_date) < hoy

  return (
    <div className={`brika-card p-4 flex items-start gap-3 ${completada ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => canToggle && onToggle(nota)}
        disabled={!canToggle}
        title={completada ? 'Marcar como pendiente' : 'Marcar como completada'}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors
          ${completada
            ? 'bg-orange border-orange text-white'
            : 'border-border-secondary text-transparent hover:border-orange'}
          ${canToggle ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {completada ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Circle className="w-3 h-3" strokeWidth={0} />}
      </button>

      <div className="flex-1 min-w-0">
        {nota.titulo && (
          <p className={`text-sm font-semibold text-text-primary ${completada ? 'line-through' : ''}`}>
            {nota.titulo}
          </p>
        )}
        <p className={`text-sm text-text-secondary whitespace-pre-wrap ${completada ? 'line-through' : ''}`}>
          {nota.nota}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-text-tertiary">
          {nota.creador_nombre && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" strokeWidth={1.5} />
              {nota.creador_nombre}
              {nota.responsable_nombre && nota.responsable_nombre !== nota.creador_nombre && (
                <> → <span className="font-medium text-text-secondary">{nota.responsable_nombre}</span></>
              )}
            </span>
          )}
          {!nota.creador_nombre && nota.responsable_nombre && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" strokeWidth={1.5} />
              Para: <span className="font-medium text-text-secondary">{nota.responsable_nombre}</span>
            </span>
          )}
          {nota.propiedad_nombre && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" strokeWidth={1.5} />
              {nota.propiedad_nombre}
            </span>
          )}
          {nota.after_date && (
            <span className={`flex items-center gap-1 ${vencida ? 'text-red-500 font-medium' : ''}`}>
              <CalendarClock className="w-3 h-3" strokeWidth={1.5} />
              {vencida ? `Venció · ${fmtDate(nota.after_date)}` : `Antes del ${fmtDate(nota.after_date)}`}
            </span>
          )}
          {nota.created_at && <span>Creada {fmtDateTime(nota.created_at)}</span>}
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(nota)}
            title="Editar"
            className="p-1.5 rounded-[var(--radius-sm)] cursor-pointer text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Pencil className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(nota)}
            title="Eliminar"
            className="p-1.5 rounded-[var(--radius-sm)] cursor-pointer text-text-tertiary hover:text-red-500 hover:bg-bg-tertiary transition-colors"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  )
}
