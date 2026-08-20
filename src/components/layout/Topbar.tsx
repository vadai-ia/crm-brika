'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clearPermissionsCache } from '@/hooks/usePermissions'
import { ThemeToggle } from './ThemeToggle'

interface TopbarProps {
  userName: string | null
}

export function Topbar({ userName }: TopbarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    clearPermissionsCache()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = userName ? userName.charAt(0).toUpperCase() : 'U'

  return (
    <header className="brika-topbar h-[var(--topbar-height)] flex items-center justify-end px-6 gap-4">
      <ThemeToggle />

      <div className="flex items-center gap-3">
        <span
          className="text-[14px] font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          {userName ?? 'Usuario'}
        </span>
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: '32px', height: '32px', background: '#A31CDC' }}
        >
          <span className="text-[13px] font-semibold text-white">{initial}</span>
        </div>
        <button
          onClick={handleSignOut}
          title="Cerrar sesión"
          className="brika-icon-btn"
          style={{ width: '32px', height: '32px' }}
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
    </header>
  )
}
