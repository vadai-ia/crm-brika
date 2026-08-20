'use client'

import { useState } from 'react'
import { AlertTriangle, Copy, KeyRound, Loader2 } from 'lucide-react'
import type { ToastType } from '@/components/ui/Toast'

interface AsesorPasswordResetProps {
  asesorId: string
  onToast: (message: string, type: ToastType) => void
  /** Mientras la contraseña está en pantalla el modal no debe cerrarse. */
  onLockChange: (locked: boolean) => void
}

export function AsesorPasswordReset({ asesorId, onToast, onLockChange }: AsesorPasswordResetProps) {
  const [password, setPassword] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await fetch(`/api/asesores/${asesorId}/reset-password`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        onToast(body.error || 'Error al resetear', 'error')
        return
      }
      setPassword(body.password)
      onLockChange(true)
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setResetting(false)
    }
  }

  const handleCopy = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.getElementById('reset-pw-display') as HTMLInputElement | null
      input?.select()
    }
  }

  const handleDone = () => {
    setPassword(null)
    onLockChange(false)
  }

  return (
    <section className="border-t border-border-primary pt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Contraseña</h3>

      {password ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-[var(--radius-sm)] bg-orange/10 border border-orange/20">
            <AlertTriangle className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-sm text-orange font-medium">
              Esta contraseña solo se muestra una vez. Cópiala ahora y compártela con el usuario.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="reset-pw-display"
              readOnly
              value={password}
              className="flex-1 h-10 px-3 text-sm font-mono rounded-[var(--radius-sm)] border-2 border-orange bg-bg-primary text-text-primary select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="h-10 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" strokeWidth={1.5} />
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleDone}
              className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer"
            >
              Listo, ya la copié
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
            border border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-tertiary
            disabled:opacity-50 transition-colors cursor-pointer"
        >
          {resetting
            ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            : <KeyRound className="w-4 h-4" strokeWidth={1.5} />}
          Resetear contraseña
        </button>
      )}
    </section>
  )
}
