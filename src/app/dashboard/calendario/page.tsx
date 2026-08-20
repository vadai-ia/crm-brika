'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Unlink, Settings } from 'lucide-react'
import { useGoogleConnection } from '@/hooks/useGoogleConnection'
import { usePermissions } from '@/hooks/usePermissions'
import { GoogleConnectScreen } from '@/components/calendar/GoogleConnectScreen'
import { CalendarView } from '@/components/calendar/CalendarView'
import { CalendarSelector } from '@/components/calendar/CalendarSelector'
import { AsesorFilter } from '@/components/calendar/AsesorFilter'
import { Toast, type ToastType } from '@/components/ui/Toast'

export default function CalendarioPage() {
  const { isConnected, loading } = useGoogleConnection()
  const { can, loading: permsLoading } = usePermissions()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showSelector, setShowSelector] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [connected, setConnected] = useState(false)
  const [tab, setTab] = useState<'personal' | 'team'>('personal')
  const [myUserId, setMyUserId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [teamReady, setTeamReady] = useState(false)

  const canSeeTeam = can('asesores.view')

  useEffect(() => {
    setConnected(isConnected)
  }, [isConnected])

  useEffect(() => {
    if (searchParams.get('setup') === 'true') setShowSelector(true)
    if (searchParams.get('error')) setToast({ message: 'Error al conectar con Google', type: 'error' })
  }, [searchParams])

  useEffect(() => {
    if (!canSeeTeam) return
    fetch('/api/calendar/admin/asesores')
      .then((r) => r.json())
      .then((data) => {
        const users: { userId: string }[] = data.data ?? []
        const myId: string = data.adminUserId ?? ''
        setMyUserId(myId)
        const ids = new Set(users.map((u) => u.userId).filter((id) => id !== myId))
        setSelectedUserIds(ids)
        setTeamReady(true)
      })
      .catch(() => setTeamReady(true))
  }, [canSeeTeam])

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/google/disconnect', { method: 'POST' })
      setConnected(false)
    } catch {
      setToast({ message: 'Error al desconectar', type: 'error' })
    } finally {
      setDisconnecting(false)
    }
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

  if (loading || permsLoading) {
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
        <h1 className="brika-page-title">Calendario</h1>
        <div className="flex items-center gap-2">
          {canSeeTeam && (
            <div className="flex items-center border border-border-primary rounded-full overflow-hidden">
              <button
                onClick={() => setTab('personal')}
                className={`h-8 px-3 text-xs font-medium transition-colors cursor-pointer ${tab === 'personal' ? 'bg-orange text-white' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Mi Calendario
              </button>
              <button
                onClick={() => setTab('team')}
                className={`h-8 px-3 text-xs font-medium transition-colors cursor-pointer ${tab === 'team' ? 'bg-orange text-white' : 'text-text-secondary hover:text-text-primary'}`}
              >
                Equipo
              </button>
            </div>
          )}
          <button
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[var(--radius-sm)] border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
            Cambiar calendario
          </button>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[var(--radius-sm)] text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Unlink className="w-3.5 h-3.5" strokeWidth={1.5} />
            Desconectar
          </button>
        </div>
      </div>

      {tab === 'team' && canSeeTeam && teamReady && (
        <AsesorFilter adminUserId={myUserId} selectedUserIds={selectedUserIds} onToggle={handleToggleUser} hideSelf />
      )}

      {tab === 'personal' ? (
        <CalendarView />
      ) : (
        <CalendarView
          mode="admin"
          selectedUserIds={selectedUserIdsStr || undefined}
          excludeUserId={myUserId || undefined}
        />
      )}

      {showSelector && (
        <CalendarSelector onSelect={() => { setShowSelector(false); router.replace('/dashboard/calendario') }} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
