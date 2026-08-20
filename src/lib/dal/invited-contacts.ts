import { createAdminClient } from '@/lib/supabase/admin'

export interface InvitedContact {
  email: string
  name?: string | null
  times_used: number
  last_used_at: string
}

export async function searchInvitedContacts(
  userId: string,
  query: string,
  limit = 10
): Promise<InvitedContact[]> {
  const supabase = createAdminClient()
  let q = supabase
    .from('invited_contacts')
    .select('email, name, times_used, last_used_at')
    .eq('user_id', userId)

  const trimmed = query.trim()
  if (trimmed) {
    q = q.ilike('email', `%${trimmed}%`)
  }

  const { data, error } = await q
    .order('times_used', { ascending: false })
    .order('last_used_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as InvitedContact[]
}

export async function upsertInvitedContacts(userId: string, emails: string[]): Promise<void> {
  if (emails.length === 0) return
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const cleaned = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (cleaned.length === 0) return

  const { data: existing } = await supabase
    .from('invited_contacts')
    .select('email, times_used')
    .eq('user_id', userId)
    .in('email', cleaned)

  const existingMap = new Map((existing ?? []).map((r) => [r.email as string, r.times_used as number]))

  const rows = cleaned.map((email) => ({
    user_id: userId,
    email,
    times_used: (existingMap.get(email) ?? 0) + 1,
    last_used_at: now,
  }))

  await supabase.from('invited_contacts').upsert(rows, { onConflict: 'user_id,email' })
}
