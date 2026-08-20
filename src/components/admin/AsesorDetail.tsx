'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Pencil, Copy, Check, Trash2, UserCheck, UserX } from 'lucide-react'
import type { Profile, ProfileWithAuth } from '@/types'
import type { Role } from '@/types/roles'
import type { ToastType } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDateTime } from '@/lib/utils/format'
import { ROLE_ADMIN, THEME_LABELS, roleBadgeClass } from '@/lib/utils/constants'
import { AsesorAvatar } from './AsesorAvatar'
import { AsesorEditForm } from './AsesorEditForm'
import { AsesorPasswordReset } from './AsesorPasswordReset'
import { AsesorRolePermissions } from './AsesorRolePermissions'

interface AsesorDetailProps {
  asesor: ProfileWithAuth
  roles: Role[]
  currentUserId: string | null
  isAdmin: boolean
  canEdit: boolean
  canDelete: boolean
  onClose: () => void
  onToggle: (asesor: ProfileWithAuth) => void
  onUpdated: (profile: Profile) => void
  onDeleted: (id: string) => void
  onToast: (message: string, type: ToastType) => void
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className={`text-text-primary font-medium mt-0.5 break-all ${mono ? 'font-mono text-xs' : 'text-sm'}`}>
        {children}
      </dd>
    </div>
  )
}

export function AsesorDetail({
  asesor, roles, currentUserId, isAdmin, canEdit, canDelete,
  onClose, onToggle, onUpdated, onDeleted, onToast,
}: AsesorDetailProps) {
  const [editing, setEditing] = useState(false)
  const [locked, setLocked] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const isSelf = asesor.id === currentUserId
  const targetIsAdmin = asesor.role === ROLE_ADMIN
  const mayManage = canEdit && (isAdmin || !targetIsAdmin)
  const mayDelete = canDelete && !isSelf && (isAdmin || !targetIsAdmin)

  const roleObj = useMemo(() => roles.find((r) => r.name === asesor.role) ?? null, [roles, asesor.role])
  const roleLabel = roleObj?.display_name ?? asesor.role

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape' && !locked) onClose() },
    [onClose, locked]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(asesor.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard no disponible
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/asesores/${asesor.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        onToast('Usuario eliminado', 'success')
        setConfirmDelete(false)
        onDeleted(asesor.id)
      } else {
        const body = await res.json().catch(() => ({}))
        onToast(body.error || 'Error al eliminar', 'error')
      }
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const ACTION_BTN = 'h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" onClick={locked ? undefined : onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[640px] max-h-[90vh] overflow-y-auto
            bg-bg-secondary dark:bg-glass-bg dark:backdrop-blur-[var(--glass-blur)]
            border border-border-primary dark:border-glass-border
            rounded-[20px] shadow-xl
            max-md:fixed max-md:inset-0 max-md:max-w-none max-md:max-h-none max-md:rounded-none"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-border-primary bg-bg-secondary dark:bg-glass-bg">
            <div className="flex items-center gap-3 min-w-0">
              <AsesorAvatar name={asesor.full_name} url={asesor.avatar_url} size={40} />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-text-primary truncate">{asesor.full_name}</h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`brika-badge ${roleBadgeClass(asesor.role)}`}>{roleLabel}</span>
                  <span className={`brika-badge ${asesor.is_active ? 'brika-badge-active' : 'brika-badge-inactive'}`}>
                    {asesor.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  {isSelf && <span className="brika-badge bg-orange/10 text-orange">Tú</span>}
                </div>
              </div>
            </div>
            {!locked && (
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] hover:bg-bg-tertiary transition-colors cursor-pointer flex-shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-text-secondary" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {editing ? (
              <AsesorEditForm
                asesor={asesor}
                roles={roles}
                isAdmin={isAdmin}
                isSelf={isSelf}
                onCancel={() => setEditing(false)}
                onSaved={(p) => { onUpdated(p); setEditing(false) }}
                onToast={onToast}
              />
            ) : (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Datos del perfil</h3>
                  {mayManage && !locked && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-[var(--radius-sm)] border border-border-primary text-text-secondary hover:text-orange hover:border-orange/40 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Editar
                    </button>
                  )}
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Nombre completo">{asesor.full_name}</Field>
                  <Field label="Email">{asesor.email}</Field>
                  <Field label="Rol">
                    {roleLabel} <span className="font-mono text-xs text-text-tertiary">({asesor.role})</span>
                  </Field>
                  <Field label="Estado">{asesor.is_active ? 'Activo' : 'Desactivado'}</Field>
                  <Field label="Tema">{asesor.theme_preference ? THEME_LABELS[asesor.theme_preference] : '—'}</Field>
                  <Field label="Email confirmado">
                    {asesor.email_confirmed_at ? formatDateTime(asesor.email_confirmed_at) : 'No'}
                  </Field>
                  <Field label="Último acceso">
                    {asesor.last_sign_in_at ? formatDateTime(asesor.last_sign_in_at) : 'Nunca ha iniciado sesión'}
                  </Field>
                  <Field label="Registro">{formatDateTime(asesor.created_at)}</Field>
                  <Field label="Última actualización">{formatDateTime(asesor.updated_at)}</Field>
                  <Field label="Avatar URL" mono>
                    {asesor.avatar_url
                      ? <a href={asesor.avatar_url} target="_blank" rel="noreferrer" className="text-orange hover:underline">{asesor.avatar_url}</a>
                      : '—'}
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="ID (uuid de auth.users / profiles)" mono>
                      <span className="inline-flex items-center gap-2">
                        {asesor.id}
                        <button onClick={copyId} className="text-text-tertiary hover:text-orange transition-colors cursor-pointer" title="Copiar ID">
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
                        </button>
                      </span>
                    </Field>
                  </div>
                </dl>
              </section>
            )}

            <AsesorRolePermissions role={asesor.role} roleObj={roleObj} />

            {mayManage && !editing && (
              <AsesorPasswordReset asesorId={asesor.id} onToast={onToast} onLockChange={setLocked} />
            )}

            {!locked && !editing && (mayManage || mayDelete) && (
              <div className="border-t border-border-primary pt-5 flex items-center gap-3 flex-wrap">
                {mayManage && (
                  <button
                    onClick={() => onToggle(asesor)}
                    disabled={isSelf}
                    title={isSelf ? 'No puedes desactivar tu propia cuenta' : undefined}
                    className={`${ACTION_BTN} ${asesor.is_active
                      ? 'border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                      : 'border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'}`}
                  >
                    {asesor.is_active ? <UserX className="w-4 h-4" strokeWidth={1.5} /> : <UserCheck className="w-4 h-4" strokeWidth={1.5} />}
                    {asesor.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                )}
                {mayDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className={`${ACTION_BTN} border border-red-500/30 text-red-500 hover:bg-red-500/10`}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar usuario"
          message={`¿Eliminar a "${asesor.full_name}" (${asesor.email})? Se borra su cuenta de acceso y su perfil; esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
