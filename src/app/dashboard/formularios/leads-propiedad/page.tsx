'use client'

import { LeadsTable, type LeadColumn } from '@/components/formularios/LeadsTable'
import { DateCell, EmailCell, MessageCell, PhoneCell, TextCell } from '@/components/formularios/cells'
import type { LeadPropiedad } from '@/lib/dal/leads'

const COLUMNS: LeadColumn<LeadPropiedad>[] = [
  { key: 'created_at', label: 'Fecha', render: (l) => <DateCell value={l.created_at} /> },
  {
    key: 'nombre',
    label: 'Nombre',
    render: (l) => <span className="font-medium">{l.nombre || '—'}</span>,
  },
  { key: 'email', label: 'Email', render: (l) => <EmailCell value={l.email} /> },
  { key: 'telefono', label: 'Teléfono', render: (l) => <PhoneCell value={l.telefono} /> },
  { key: 'interes', label: 'Interés', render: (l) => <TextCell value={l.interes} /> },
  { key: 'propiedad', label: 'Propiedad', render: (l) => <TextCell value={l.propiedad} /> },
  { key: 'mensaje', label: 'Mensaje', render: (l) => <MessageCell value={l.mensaje} /> },
]

export default function LeadsPropiedadPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="brika-page-title">Leads Propiedad</h1>
        <p className="brika-page-desc mt-1">
          Contactos recibidos desde el formulario web de propiedades
        </p>
      </div>

      <LeadsTable
        endpoint="/api/formularios/leads-propiedades"
        columns={COLUMNS}
        emptyMessage="Aún no hay leads de propiedades"
        searchPlaceholder="Buscar por nombre, email, propiedad..."
      />
    </div>
  )
}
