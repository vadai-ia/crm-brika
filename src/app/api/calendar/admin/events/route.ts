import { NextRequest, NextResponse } from 'next/server'
import { getConnectedUsersWithProfiles } from '@/lib/dal/google-tokens'
import { getEvents } from '@/lib/google/calendar'
import { requirePermission, isAuthError } from '@/lib/auth/permissions'

const ASESOR_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EC4899', '#06B6D4', '#F97316', '#EF4444',
]
const ADMIN_COLOR = '#6B7280'

export async function GET(request: NextRequest) {
  const auth = await requirePermission('asesores.view')
  if (isAuthError(auth)) return auth

  const params = request.nextUrl.searchParams
  const start = params.get('start')
  const end = params.get('end')
  const filterUserId = params.get('userId')
  const filterUserIds = params.get('userIds')
  const excludeUserId = params.get('excludeUserId')

  if (!start || !end) return NextResponse.json({ error: 'start and end required' }, { status: 400 })

  try {
    const allUsers = await getConnectedUsersWithProfiles(
      auth.isAdmin ? undefined : { excludeRoles: ['admin'] }
    )

    // Separate caller from others
    const adminUser = allUsers.find((u) => u.userId === auth.userId)
    const asesores = allUsers.filter((u) => u.userId !== auth.userId)

    let usersToFetch = allUsers
    if (filterUserIds) {
      const ids = new Set(filterUserIds.split(','))
      usersToFetch = allUsers.filter((u) => ids.has(u.userId))
    } else if (filterUserId) {
      usersToFetch = allUsers.filter((u) => u.userId === filterUserId)
    }
    if (excludeUserId) {
      usersToFetch = usersToFetch.filter((u) => u.userId !== excludeUserId)
    }

    // Assign colors: caller (admin) = gray, asesores = rotating palette
    const colorMap = new Map<string, string>()
    colorMap.set(auth.userId, ADMIN_COLOR)
    let colorIdx = 0
    for (const a of asesores) {
      colorMap.set(a.userId, ASESOR_COLORS[colorIdx % ASESOR_COLORS.length])
      colorIdx++
    }

    const nameMap = new Map<string, string>()
    if (adminUser) nameMap.set(adminUser.userId, 'Mis eventos')
    for (const a of asesores) nameMap.set(a.userId, a.fullName)

    const results = await Promise.allSettled(
      usersToFetch.slice(0, 10).map(async (u) => {
        const events = await getEvents(u.userId, start, end)
        const color = colorMap.get(u.userId) || ASESOR_COLORS[0]
        const name = nameMap.get(u.userId) || u.fullName
        return events.map((ev) => ({
          ...ev,
          backgroundColor: color,
          borderColor: color,
          asesorName: name,
          asesorColor: color,
          title: ev.title,
        }))
      })
    )

    const allEvents = results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<unknown[]>).value)

    return NextResponse.json({ data: allEvents })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
