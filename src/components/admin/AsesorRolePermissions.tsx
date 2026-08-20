'use client'

import { ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react'
import type { Role } from '@/types/roles'
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '@/types/roles'
import { ROLE_ADMIN } from '@/lib/utils/constants'

interface AsesorRolePermissionsProps {
  role: string
  roleObj: Role | null
}

/** Lista (solo lectura) de lo que el rol del usuario le permite hacer. */
export function AsesorRolePermissions({ role, roleObj }: AsesorRolePermissionsProps) {
  const total = Object.keys(ALL_PERMISSIONS).length

  if (role === ROLE_ADMIN) {
    return (
      <section className="border-t border-border-primary pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Permisos</h3>
        <div className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] bg-orange/10 border border-orange/20">
          <ShieldCheck className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text-primary">Acceso total</p>
            <p className="text-xs text-text-secondary mt-0.5">
              El rol <code className="font-mono">admin</code> ignora la matriz de permisos: puede ver y hacer todo
              ({total} permisos), incluida la gestión de roles.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!roleObj) {
    return (
      <section className="border-t border-border-primary pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Permisos</h3>
        <div className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-sm text-red-600 dark:text-red-400">
            El rol <code className="font-mono">{role}</code> no existe en la tabla <code className="font-mono">roles</code>:
            este usuario no tiene ningún permiso. Asígnale un rol válido.
          </p>
        </div>
      </section>
    )
  }

  const perms = roleObj.permissions ?? {}
  const granted = Object.keys(ALL_PERMISSIONS).filter((k) => perms[k] === true)
  const groups = PERMISSION_GROUPS
    .map((g) => ({ label: g.label, keys: g.keys.filter((k) => perms[k] === true) }))
    .filter((g) => g.keys.length > 0)

  return (
    <section className="border-t border-border-primary pt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Permisos del rol {roleObj.display_name}
        </h3>
        <span className="text-xs text-text-tertiary">{granted.length} de {total}</span>
      </div>

      {granted.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <ShieldOff className="w-4 h-4 text-text-tertiary" strokeWidth={1.5} />
          Este rol no tiene permisos habilitados.
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-text-secondary w-28 flex-shrink-0">{g.label}</span>
              {g.keys.map((k) => (
                <span key={k} className="brika-badge brika-badge-active" title={k}>
                  {ALL_PERMISSIONS[k]}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
