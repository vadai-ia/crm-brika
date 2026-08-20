import { createAdminClient } from '@/lib/supabase/admin'

export interface GoogleToken {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  token_expiry: string
  calendar_email: string | null
  selected_calendar_id: string
  selected_calendar_name: string | null
  is_connected: boolean
  created_at: string
  updated_at: string
}

export async function getTokenByUserId(userId: string): Promise<GoogleToken | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as GoogleToken
}

export async function saveTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiry: Date,
  email: string | null
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('google_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: expiry.toISOString(),
      calendar_email: email,
      is_connected: true,
    }, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)
}

export async function updateAccessToken(
  userId: string,
  accessToken: string,
  expiry: Date
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('google_tokens')
    .update({
      access_token: accessToken,
      token_expiry: expiry.toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function updateSelectedCalendar(
  userId: string,
  calendarId: string,
  calendarName: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('google_tokens')
    .update({
      selected_calendar_id: calendarId,
      selected_calendar_name: calendarName,
    })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function deleteTokens(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('google_tokens')
    .delete()
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export interface ConnectedUser {
  userId: string
  fullName: string
  calendarEmail: string | null
  calendarName: string | null
}

export async function getConnectedUsersWithProfiles(
  options?: { excludeRoles?: string[] }
): Promise<ConnectedUser[]> {
  const supabase = createAdminClient()

  const { data: tokens, error: tokErr } = await supabase
    .from('google_tokens')
    .select('user_id, calendar_email, selected_calendar_name')
    .eq('is_connected', true)

  if (tokErr || !tokens) return []

  const userIds = tokens.map((t) => t.user_id as string)
  if (userIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .in('id', userIds)

  const excludeRoles = options?.excludeRoles ?? []
  const allowedIds = new Set(
    (profiles ?? [])
      .filter((p) => !excludeRoles.includes(p.role as string))
      .map((p) => p.id as string)
  )
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  return tokens
    .filter((t) => allowedIds.has(t.user_id as string))
    .map((t) => ({
      userId: t.user_id as string,
      fullName: (profileMap.get(t.user_id as string) as string) ?? 'Sin nombre',
      calendarEmail: t.calendar_email as string | null,
      calendarName: t.selected_calendar_name as string | null,
    }))
}
