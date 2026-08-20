import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/types/roles'

export async function getRoles(): Promise<Role[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('is_system', { ascending: false })
    .order('display_name')

  if (error) throw new Error(error.message)
  return data as Role[]
}

export async function getRoleByName(name: string): Promise<Role | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single()

  if (error) return null
  return data as Role
}

export async function createRole(
  name: string,
  displayName: string,
  description: string | null,
  permissions: Record<string, boolean>
): Promise<Role> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('roles')
    .insert({ name, display_name: displayName, description, permissions })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Role
}

export async function updateRole(
  id: string,
  displayName: string,
  description: string | null,
  permissions: Record<string, boolean>
): Promise<Role> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('roles')
    .update({ display_name: displayName, description, permissions })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Role
}

export async function deleteRole(id: string): Promise<void> {
  const supabase = createAdminClient()

  // Check not system
  const { data: role } = await supabase.from('roles').select('name, is_system').eq('id', id).single()
  if (role?.is_system) throw new Error('No se puede eliminar un rol del sistema')

  // Check no users assigned
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', role?.name)
  if ((count ?? 0) > 0) throw new Error('No se puede eliminar un rol con usuarios asignados')

  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getUserPermissions(userId: string): Promise<Record<string, boolean>> {
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile) return {}

  // Admin always has all permissions
  if (profile.role === 'admin') {
    return { _isAdmin: true }
  }

  const { data: role } = await supabase
    .from('roles')
    .select('permissions')
    .eq('name', profile.role)
    .single()

  if (!role) return {}
  return (role.permissions as Record<string, boolean>) ?? {}
}
