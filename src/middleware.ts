import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  // /login → if authenticated → redirect /dashboard
  if (pathname === '/login') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // /dashboard/* → if no session → redirect /login
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check is_active and role
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      // Deactivated user → sign out and redirect to login
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // /dashboard/admin/* → admin or matching role permission
      if (pathname.startsWith('/dashboard/admin')) {
        const isAdmin = profile?.role === 'admin'

        // Roles page is always admin-only
        if (pathname.startsWith('/dashboard/admin/roles')) {
          if (!isAdmin) {
            return NextResponse.redirect(new URL('/dashboard/propiedades', request.url))
          }
        } else if (!isAdmin) {
          const ADMIN_PATH_PERMISSIONS: Array<[string, string]> = [
            ['/dashboard/admin/asesores', 'asesores.view'],
            ['/dashboard/admin/desarrollos', 'desarrollos.view'],
            ['/dashboard/admin/columnas', 'columnas.view'],
            ['/dashboard/admin/webhooks', 'webhooks.view'],
            ['/dashboard/admin/api-keys', 'apikeys.view'],
            ['/dashboard/admin/anuncios', 'anuncios.view'],
            ['/dashboard/admin/propiedades', 'propiedades.view'],
            ['/dashboard/admin/calendario', 'asesores.view'],
            ['/dashboard/admin/carga-masiva', 'carga_masiva.view'],
          ]
          const match = ADMIN_PATH_PERMISSIONS.find(([p]) => pathname.startsWith(p))
          if (!match || !profile?.role) {
            return NextResponse.redirect(new URL('/dashboard/propiedades', request.url))
          }
          const { data: role } = await supabase
            .from('roles')
            .select('permissions')
            .eq('name', profile.role)
            .single()
          const perms = (role?.permissions as Record<string, boolean> | null) ?? {}
          if (!perms[match[1]]) {
            return NextResponse.redirect(new URL('/dashboard/propiedades', request.url))
          }
        }
      }
    } catch (error) {
      console.error('Error checking profile in middleware:', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
