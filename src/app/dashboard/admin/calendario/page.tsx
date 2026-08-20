'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Unlink, Settings } from 'lucide-react'
import { useGoogleConnection } from '@/hooks/useGoogleConnection'
import { GoogleConnectScreen } from '@/components/calendar/GoogleConnectScreen'
import { CalendarView } from '@/components/calendar/CalendarView'
import { CalendarSelector } from '@/components/calendar/CalendarSelector'
import { AsesorFilter } from '@/components/calendar/AsesorFilter'
import { Toast, type ToastType } from '@/components/ui/Toast'

export default function AdminCalendarioPage() {
  const { isConnected, loading } = useGoogleConnection()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showSelector, setShowSelector] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [connected, setConnected] = useState(false)
  const [viewMode, setViewMode] = useState<'personal' | 'admin'>('admin')
  const [adminUserId, setAdminUserId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => { setConnected(isConnected) }, [isConnected])

  useEffect(() => {
    if (searchParams.get('setup') === 'true') setShowSelector(true)
    if (searchParams.get('error')) setToast({ message: 'Error al conectar con Google', type: 'error' })
  }, [searchParams])

  // Initialize: get connected users, admin ID, select all by default
  useEffect(() => {
    fetch('/api/calendar/admin/asesores')
      .then((r) => r.json())
      .then((data) => {
        const users: { userId: string }[] = data.data ?? []
        const aId: string = data.adminUserId ?? ''
        setAdminUserId(aId)
        const allIds = new Set(users.map((u) => u.userId))
        if (aId && !allIds.has(aId)) allIds.add(aId)
        setSelectedUserIds(allIds)
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/google/disconnect', { method: 'POST' })
      setConnected(false)
    } catch {
      setToast({ message: 'Error al desconectar', type: 'error' })
    } finally { setDisconnecting(false) }
  }, [])

  const handleToggleUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }, [])

  const selectedUserIdsStr = useMemo(() => [...selectedUserIds].join(','), [selectedUserIds])

  if (loading || !ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-text-tertiary animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  if (!connected) return <GoogleConnectScreen />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Calendario</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border-primary rounded-full overflow-hidden">
            <button onClick={() => setViewMode('personal')}
              className={`h-8 px-3 text-xs font-medium transition-colors cursor-pointer ${viewMode === 'personal' ? 'bg-orange text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              Mi calendario
            </button>
            <button onClick={() => setViewMode('admin')}
              className={`h-8 px-3 text-xs font-medium transition-colors cursor-pointer ${viewMode === 'admin' ? 'bg-orange text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              Global
            </button>
          </div>
          <button onClick={() => setShowSelector(true)}
            className="flex items-center h-8 px-3 text-xs rounded-[var(--radius-sm)] border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer">
            <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button onClick={handleDisconnect} disabled={disconnecting}
            className="flex items-center h-8 px-3 text-xs rounded-[var(--radius-sm)] text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50">
            <Unlink className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {viewMode === 'admin' && (
        <AsesorFilter adminUserId={adminUserId} selectedUserIds={selectedUserIds} onToggle={handleToggleUser} />
      )}

      <CalendarView
        mode={viewMode}
        selectedUserIds={viewMode === 'admin' && selectedUserIdsStr ? selectedUserIdsStr : undefined}
      />

      {showSelector && (
        <CalendarSelector onSelect={() => { setShowSelector(false); router.replace('/dashboard/admin/calendario') }} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
