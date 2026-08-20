import { createAdminClient } from '@/lib/supabase/admin'
import { getRoleByName } from '@/lib/dal/roles'
import { ROLE_ASESOR } from '@/lib/utils/constants'
import type { Profile, ProfileWithAuth } from '@/types'
import type { CreateAsesorInput, UpdateAsesorInput } from '@/lib/validations/asesor'

// Gestión administrativa de usuarios (tabla `profiles` + `auth.users`).
// Todo va con el cliente admin (service role); las rutas verifican permisos antes de llamar aquí.

/** Máximo de perfiles por request (ERROR-JOURNAL #2: nunca más de 50 por página). */
export const ASESORES_PAGE_SIZE = 50

interface AuthMeta {
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

const EMPTY_AUTH_META: AuthMeta = { last_sign_in_at: null, email_confirmed_at: null }

type AdminClient = ReturnType<typeof createAdminClient>

async function getAuthMeta(supabase: AdminClient): Promise<Map<string, AuthMeta>> {
  const map = new Map<string, AuthMeta>()
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) {
    console.error('Error listing auth users:', error.message)
    return map
  }
  for (const u of data.users) {
    map.set(u.id, {
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
    })
  }
  return map
}

export interface ProfilesPage {
  data: ProfileWithAuth[]
  nextCursor: string | null
}

/** Página de perfiles (todos los roles, incluidos admins) ordenada por fecha de registro desc. */
export async function getProfilesPage(
  opts: { before?: string | null; limit?: number } = {}
): Promise<ProfilesPage> {
  const limit = Math.min(Math.max(opts.limit ?? ASESORES_PAGE_SIZE, 1), ASESORES_PAGE_SIZE)
  const supabase = createAdminClient()

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1)
  if (opts.before) query = query.lt('created_at', opts.before)

  const [{ data, error }, authMeta] = await Promise.all([query, getAuthMeta(supabase)])
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Profile[]
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    data: page.map((p) => ({ ...p, ...(authMeta.get(p.id) ?? EMPTY_AUTH_META) })),
    nextCursor: hasMore ? page[page.length - 1].created_at : null,
  }
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (error) return null
  return data as Profile
}

async function assertRoleExists(role: string): Promise<void> {
  const found = await getRoleByName(role)
  if (!found) throw new Error(`El rol "${role}" no existe`)
}

export async function createAsesor(input: CreateAsesorInput): Promise<Profile> {
  const role = input.role || ROLE_ASESOR
  await assertRoleExists(role)

  const supabase = createAdminClient()
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  })
  if (authError) throw new Error(authError.message)

  const userId = authData.user.id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email: input.email,
      full_name: input.full_name,
      role,
      avatar_url: input.avatar_url ?? null,
    })
    .select()
    .single()

  if (profileError) {
    // Rollback: sin perfil el usuario no puede usar la app
    await supabase.auth.admin.deleteUser(userId)
    throw new Error(profileError.message)
  }
  return profile as Profile
}

export async function updateAsesor(id: string, patch: UpdateAsesorInput): Promise<Profile> {
  if (patch.role) await assertRoleExists(patch.role)
  const supabase = createAdminClient()

  // El email vive en auth.users y en profiles: primero auth (si falla, no tocamos el perfil)
  if (patch.email) {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      email: patch.email,
      email_confirm: true,
    })
    if (error) throw new Error(error.message)
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Profile
}

/** Elimina el usuario de auth; `profiles.id` tiene ON DELETE CASCADE. */
export async function deleteAsesor(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)
}

export async function resetAsesorPassword(id: string, newPassword: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(id, { password: newPassword })
  if (error) throw new Error(error.message)
}
