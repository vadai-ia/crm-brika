'use client'

import { LeadsTable, type LeadColumn } from '@/components/formularios/LeadsTable'
import { DateCell, EmailCell, MessageCell, PhoneCell, TextCell } from '@/components/formularios/cells'
import type { LeadProyecto } from '@/lib/dal/leads'

const COLUMNS: LeadColumn<LeadProyecto>[] = [
  { key: 'created_at', label: 'Fecha', render: (l) => <DateCell value={l.created_at} /> },
  {
    key: 'nombre',
    label: 'Nombre',
    render: (l) => <span className="font-medium">{l.nombre || '—'}</span>,
  },
  { key: 'empresa', label: 'Empresa', render: (l) => <TextCell value={l.empresa} /> },
  { key: 'email', label: 'Email', render: (l) => <EmailCell value={l.email} /> },
  { key: 'telefono', label: 'Teléfono', render: (l) => <PhoneCell value={l.telefono} /> },
  { key: 'industria', label: 'Industria', render: (l) => <TextCell value={l.industria} /> },
  { key: 'metros', label: 'Metros', render: (l) => <TextCell value={l.metros} /> },
  { key: 'mensaje', label: 'Mensaje', render: (l) => <MessageCell value={l.mensaje} /> },
]

export default function LeadsProyectosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="brika-page-title">Leads Proyectos</h1>
        <p className="brika-page-desc mt-1">
          Contactos recibidos desde el formulario web de proyectos
        </p>
      </div>

      <LeadsTable
        endpoint="/api/formularios/leads-proyectos"
        columns={COLUMNS}
        emptyMessage="Aún no hay leads de proyectos"
        searchPlaceholder="Buscar por nombre, empresa, industria..."
      />
    </div>
  )
}
