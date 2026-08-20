import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserPermissions } from '@/lib/dal/roles'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const permissions = await getUserPermissions(user.id)
    return NextResponse.json({ permissions })
  } catch {
    return NextResponse.json({ permissions: {} })
  }
}
