'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import type { UserRole } from '@/types'

interface DashboardShellProps {
  role: UserRole
  userName: string | null
  children: React.ReactNode
}

export function DashboardShell({ role, userName, children }: DashboardShellProps) {
  return (
    <div className="min-h-screen">
      <Sidebar role={role} />
      <div className="lg:ml-[var(--sidebar-width)]">
        <Topbar userName={userName} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
