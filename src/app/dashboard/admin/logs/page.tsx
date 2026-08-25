'use client'

import { useState } from 'react'
import { Activity, History } from 'lucide-react'
import { ActivityLogsTab } from '@/components/logs/ActivityLogsTab'
import { TechLogsTab } from '@/components/logs/TechLogsTab'

type Tab = 'actividad' | 'tecnicos'

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>('actividad')

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'actividad', label: 'Actividad', icon: <History className="w-4 h-4" strokeWidth={1.5} /> },
    { key: 'tecnicos', label: 'Técnicos', icon: <Activity className="w-4 h-4" strokeWidth={1.5} /> },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="brika-page-title">Logs</h1>
        <p className="brika-page-desc mt-1">
          {tab === 'actividad'
            ? 'Historial de cambios en el CRM: quién creó, editó o eliminó qué, campo por campo, y el detalle de cada carga masiva.'
            : 'Requests de la API: errores con su mensaje, escrituras y requests lentos, con status HTTP y duración.'}
        </p>
      </div>

      <div className="inline-flex p-1 rounded-[var(--radius-sm)] bg-bg-tertiary border border-border-primary">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 h-8 px-3 text-sm font-medium rounded-[6px] transition-colors cursor-pointer ${
              tab === t.key
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'actividad' ? <ActivityLogsTab /> : <TechLogsTab />}
    </div>
  )
}
