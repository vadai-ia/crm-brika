import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/dal/users'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    profile = await getProfile(user.id)
  }

  const role = profile?.role ?? 'asesor'
  const userName = profile?.full_name ?? user?.email ?? null

  return (
    <DashboardShell role={role} userName={userName}>
      {children}
    </DashboardShell>
  )
}
