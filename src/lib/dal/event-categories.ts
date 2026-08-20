import { createAdminClient } from '@/lib/supabase/admin'

export interface EventCategory {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export async function getCategoriesByUser(userId: string): Promise<EventCategory[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('event_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error) throw new Error(error.message)
  return data as EventCategory[]
}

export async function createCategory(userId: string, name: string, color: string): Promise<EventCategory> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('event_categories')
    .insert({ user_id: userId, name, color })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EventCategory
}

export async function updateCategory(id: string, name: string, color: string): Promise<EventCategory> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('event_categories')
    .update({ name, color })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EventCategory
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('event_categories')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
