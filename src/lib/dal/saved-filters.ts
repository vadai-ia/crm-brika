import { createAdminClient } from '@/lib/supabase/admin'

export interface SavedFilter {
  id: string
  user_id: string
  name: string
  filters: Record<string, string>
  created_at: string
}

export async function getSavedFilters(userId: string): Promise<SavedFilter[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as SavedFilter[]
}

export async function saveFilter(
  userId: string,
  name: string,
  filters: Record<string, string>
): Promise<SavedFilter> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('saved_filters')
    .insert({ user_id: userId, name, filters })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SavedFilter
}

export async function deleteFilter(id: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('saved_filters')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}
