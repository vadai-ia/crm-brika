import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/dal/users'
import type { UserRole } from '@/types'
import { PropiedadesView } from './propiedades-view'

export default async function PropiedadesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role: UserRole = 'asesor'
  if (user) {
    const profile = await getProfile(user.id)
    if (profile) role = profile.role
  }

  return <PropiedadesView role={role} />
}
