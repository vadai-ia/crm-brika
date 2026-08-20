import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google/auth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = getAuthUrl(user.id)
  return NextResponse.redirect(url)
}
