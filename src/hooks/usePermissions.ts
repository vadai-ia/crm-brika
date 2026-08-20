'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UsePermissionsReturn {
  permissions: Record<string, boolean>
  can: (permission: string) => boolean
  loading: boolean
}

// Cache keyed by user id so a new user on the same tab invalidates automatically.
let cache: { userId: string; permissions: Record<string, boolean> } | null = null

/** Clear the in-memory permissions cache (call on sign-out). */
export function clearPermissionsCache() {
  cache = null
}

async function fetchPermissions(): Promise<Record<string, boolean>> {
  try {
    const r = await fetch('/api/roles/my-permissions', { cache: 'no-store' })
    if (!r.ok) return {}
    const data = await r.json()
    return data.permissions ?? {}
  } catch {
    return {}
  }
}

export function usePermissions(): UsePermissionsReturn {
  // Always start with empty perms + loading=true. The effect will populate
  // from cache (if valid for the current user) or refetch. This prevents
  // showing stale perms from a previous user after login/logout.
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        cache = null
        setPermissions({})
        setLoading(false)
        return
      }
      if (cache && cache.userId === user.id) {
        setPermissions(cache.permissions)
        setLoading(false)
        return
      }
      // Different user or no cache → refetch
      setLoading(true)
      const perms = await fetchPermissions()
      if (cancelled) return
      cache = { userId: user.id, permissions: perms }
      setPermissions(perms)
      setLoading(false)
    }

    load()

    // React to auth state changes: sign-in with a different account,
    // sign-out, or token refresh should invalidate cached perms.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        cache = null
        setPermissions({})
        setLoading(false)
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const newUserId = session.user.id
        if (!cache || cache.userId !== newUserId) {
          setLoading(true)
          fetchPermissions().then((perms) => {
            if (cancelled) return
            cache = { userId: newUserId, permissions: perms }
            setPermissions(perms)
            setLoading(false)
          })
        }
      }
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  const can = useCallback(
    (permission: string) => {
      if (permissions._isAdmin) return true
      return permissions[permission] === true
    },
    [permissions]
  )

  return { permissions, can, loading }
}
