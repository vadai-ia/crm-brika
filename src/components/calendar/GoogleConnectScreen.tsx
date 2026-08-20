'use client'

import { Calendar } from 'lucide-react'

export function GoogleConnectScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Calendar className="w-12 h-12 text-text-tertiary mb-4" strokeWidth={1.5} />
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Conecta tu Google Calendar
      </h2>
      <p className="text-sm text-text-secondary max-w-sm mb-6">
        Vincula tu cuenta de Google para ver y gestionar tus eventos desde aqui
      </p>
      <a
        href="/api/google/auth"
        className="flex items-center gap-2 h-10 px-6 text-sm font-medium rounded-[var(--radius-sm)]
          bg-orange text-white hover:bg-orange-hover transition-colors"
      >
        Conectar Google Calendar
      </a>
    </div>
  )
}
