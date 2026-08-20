import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Profile, ThemePreference, UserRole } from '@/types'

// Lecturas/escrituras del perfil propio (cliente de usuario, respeta RLS).
// La gestión administrativa de usuarios está en `lib/dal/asesores.ts`.

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error.message)
    return null
  }

  return data as Profile
}

export async function createProfile(data: {
  id: string
  email: string
  full_name: string
  role?: UserRole
}): Promise<Profile | null> {
  const supabase = createAdminClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role ?? 'asesor',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error.message)
    return null
  }

  return profile as Profile
}

export async function updateThemePreference(
  userId: string,
  theme: ThemePreference
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ theme_preference: theme })
    .eq('id', userId)

  if (error) {
    console.error('Error updating theme preference:', error.message)
  }
}
