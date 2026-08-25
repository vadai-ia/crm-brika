'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  // Calendar,      // Calendario (oculto)
  // MessageSquare, // Whaapy (oculto)
  StickyNote,
  FileSignature,
  Users,
  // Landmark,   // Desarrollos (oculto)
  // Columns3,   // Columnas (oculto)
  Webhook,
  Key,
  // Shield,     // Roles (oculto)
  History,
  Upload,
  Menu,
  X,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  permission?: string
}

interface NavChild {
  label: string
  href: string
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors ${
        isActive
          ? 'bg-white/10 text-white'
          : 'text-[var(--text-on-navy-muted)] hover:bg-white/5 hover:text-white'
      }`}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  )
}

function NavGroup({
  label,
  icon,
  childItems,
  pathname,
}: {
  label: string
  icon: React.ReactNode
  childItems: NavChild[]
  pathname: string
}) {
  const hasActive = childItems.some((c) => pathname === c.href)
  const [open, setOpen] = useState(hasActive)

  // Al navegar a un hijo desde otra ruta, abre el grupo automáticamente
  useEffect(() => {
    if (hasActive) setOpen(true)
  }, [hasActive])

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors cursor-pointer ${
          hasActive && !open
            ? 'bg-white/10 text-white'
            : 'text-[var(--text-on-navy-muted)] hover:bg-white/5 hover:text-white'
        }`}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />
      </button>
      {open && (
        <div className="mt-1 ml-4 pl-3 border-l border-white/10 space-y-1">
          {childItems.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={`block px-3 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors ${
                pathname === c.href
                  ? 'bg-white/10 text-white'
                  : 'text-[var(--text-on-navy-muted)] hover:bg-white/5 hover:text-white'
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { can, loading: permsLoading } = usePermissions()

  const isAdmin = role === 'admin'

  const mainNav: NavItem[] = [
    { label: 'Propiedades', href: '/dashboard/propiedades', icon: <Building2 className="w-5 h-5" strokeWidth={1.5} />, permission: 'propiedades.view' },
    { label: 'PDF', href: '/dashboard/pdf', icon: <FileText className="w-5 h-5" strokeWidth={1.5} />, permission: 'pdf.view' },
    { label: 'Carta Propuesta', href: '/dashboard/carta-propuesta', icon: <FileSignature className="w-5 h-5" strokeWidth={1.5} />, permission: 'carta_propuesta.view' },
    // Ocultos a pedido del usuario (2026-08-18) — descomentar para restaurar:
    // { label: 'Calendario', href: isAdmin ? '/dashboard/admin/calendario' : '/dashboard/calendario', icon: <Calendar className="w-5 h-5" strokeWidth={1.5} />, permission: 'calendario.view' },
    // { label: 'Whaapy', href: '/dashboard/whaapy', icon: <MessageSquare className="w-5 h-5" strokeWidth={1.5} />, permission: 'whaapy.view' },
    { label: 'Notas', href: '/dashboard/anuncios', icon: <StickyNote className="w-5 h-5" strokeWidth={1.5} />, permission: 'anuncios.view' },
  ]

  const formulariosChildren: NavChild[] = [
    { label: 'Leads Propiedad', href: '/dashboard/formularios/leads-propiedad' },
    { label: 'Leads Proyectos', href: '/dashboard/formularios/leads-proyectos' },
  ]
  const showFormularios = !permsLoading && can('formularios.view')

  const adminItems: NavItem[] = [
    // Ocultos a pedido del usuario (2026-08-17) — descomentar para restaurar:
    // { label: 'Desarrollos', href: '/dashboard/admin/desarrollos', icon: <Landmark className="w-5 h-5" strokeWidth={1.5} />, permission: 'desarrollos.view' },
    { label: 'Carga Masiva', href: '/dashboard/admin/carga-masiva', icon: <Upload className="w-5 h-5" strokeWidth={1.5} />, permission: 'carga_masiva.view' },
    // { label: 'Columnas', href: '/dashboard/admin/columnas', icon: <Columns3 className="w-5 h-5" strokeWidth={1.5} />, permission: 'columnas.view' },
    { label: 'Asesores', href: '/dashboard/admin/asesores', icon: <Users className="w-5 h-5" strokeWidth={1.5} />, permission: 'asesores.view' },
    // { label: 'Roles', href: '/dashboard/admin/roles', icon: <Shield className="w-5 h-5" strokeWidth={1.5} /> },
    { label: 'Webhooks', href: '/dashboard/admin/webhooks', icon: <Webhook className="w-5 h-5" strokeWidth={1.5} />, permission: 'webhooks.view' },
    { label: 'API Keys', href: '/dashboard/admin/api-keys', icon: <Key className="w-5 h-5" strokeWidth={1.5} />, permission: 'apikeys.view' },
    { label: 'Logs', href: '/dashboard/admin/logs', icon: <History className="w-5 h-5" strokeWidth={1.5} />, permission: 'logs.view' },
  ]

  // Hide nav items until permissions are loaded to avoid showing stale
  // entries from a previous user briefly after login.
  const visibleMain = permsLoading
    ? []
    : mainNav.filter((item) => !item.permission || can(item.permission))
  const visibleAdmin = permsLoading
    ? []
    : adminItems.filter((item) => {
        // Roles page is admin-only, hardcoded (not permission-based)
        if (item.href === '/dashboard/admin/roles') return isAdmin
        return !item.permission || can(item.permission)
      })
  const showAdminSection = visibleAdmin.length > 0

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-5 h-16 border-b border-white/10">
        <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.25em', color: '#FFFFFF' }}>BRIKA</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleMain.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {showFormularios && (
          <NavGroup
            label="Formularios Web"
            icon={<ClipboardList className="w-5 h-5" strokeWidth={1.5} />}
            childItems={formulariosChildren}
            pathname={pathname}
          />
        )}

        {showAdminSection && (
          <>
            <div className="pt-4 pb-2 px-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-on-navy-muted)]/50">
                Admin
              </span>
            </div>
            {visibleAdmin.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-[var(--radius-sm)] bg-navy text-white"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Menu className="w-5 h-5" strokeWidth={1.5} />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-[var(--sidebar-width)] bg-bg-sidebar
          transition-transform duration-200 ease-in-out
          lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
