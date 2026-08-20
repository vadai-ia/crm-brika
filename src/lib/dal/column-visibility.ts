import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ColumnVisibility } from '@/types'

export async function getColumnVisibility(): Promise<ColumnVisibility[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('column_visibility')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching column visibility:', error.message)
    throw new Error(error.message)
  }

  return data as ColumnVisibility[]
}

interface ColumnUpdate {
  id: string
  visible_to_asesores: boolean
  display_label: string
  display_order: number
  filter_type: string
}

export async function updateColumnVisibility(
  updates: ColumnUpdate[]
): Promise<void> {
  const supabase = createAdminClient()

  for (const update of updates) {
    const { error } = await supabase
      .from('column_visibility')
      .update({
        visible_to_asesores: update.visible_to_asesores,
        display_label: update.display_label,
        display_order: update.display_order,
        filter_type: update.filter_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', update.id)

    if (error) {
      console.error(`Error updating column ${update.id}:`, error.message)
      throw new Error(error.message)
    }
  }
}
