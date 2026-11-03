'use client'

import { Check, Copy, Mail, MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { whatsappUrl } from '@/lib/utils/format'

const ICON_BTN =
  'inline-flex items-center justify-center w-7 h-7 rounded-[6px] text-text-tertiary hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer'

export function CopyButton({ value, label, onCopied }: { value: string; label: string; onCopied: (msg: string) => void }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      onCopied(`${label} copiado`)
      setTimeout(() => setDone(false), 1500)
    } catch {
      onCopied('No se pudo copiar')
    }
  }
  return (
    <button type="button" onClick={copy} className={ICON_BTN} title={`Copiar ${label.toLowerCase()}`} aria-label={`Copiar ${label.toLowerCase()}`}>
      {done ? <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
    </button>
  )
}

const AVATAR_SIZE = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-11 h-11 text-sm' }

export function ContactAvatar({ name, size = 'md' }: { name: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?'
  return (
    <span className={`${AVATAR_SIZE[size]} flex-shrink-0 rounded-full bg-orange/10 text-orange font-semibold flex items-center justify-center`}>
      {initials}
    </span>
  )
}

export function PhoneCell({ value, onCopied }: { value: string | null; onCopied: (msg: string) => void }) {
  if (!value) return <span className="text-text-tertiary">—</span>
  const wa = whatsappUrl(value)
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <a href={`tel:${value.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 text-text-primary hover:text-orange transition-colors mr-1">
        <Phone className="w-3.5 h-3.5 text-text-tertiary" strokeWidth={1.5} />
        <span className="tabular-nums">{value}</span>
      </a>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={ICON_BTN} title="Abrir WhatsApp" aria-label="Abrir WhatsApp">
          <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
        </a>
      )}
      <CopyButton value={value} label="Celular" onCopied={onCopied} />
    </div>
  )
}

export function EmailCell({ value, onCopied }: { value: string | null; onCopied: (msg: string) => void }) {
  if (!value) return <span className="text-text-tertiary">—</span>
  return (
    <div className="flex items-center gap-1 min-w-0">
      <a href={`mailto:${value}`} className="inline-flex items-center gap-1.5 min-w-0 text-text-primary hover:text-orange transition-colors mr-1" title={value}>
        <Mail className="w-3.5 h-3.5 flex-shrink-0 text-text-tertiary" strokeWidth={1.5} />
        <span className="truncate max-w-[220px]">{value}</span>
      </a>
      <CopyButton value={value} label="Correo" onCopied={onCopied} />
    </div>
  )
}

const STATUS_CLASS: Record<string, string> = {
  disponible: 'brika-badge-disponible',
  apartado: 'brika-badge-apartado',
  rentado: 'brika-badge-rentado',
  vendido: 'brika-badge-inactive',
}

export function statusBadgeClass(estatus: string | null): string {
  const cls = estatus ? STATUS_CLASS[estatus.toLowerCase()] : undefined
  return cls ?? 'bg-black/5 text-text-secondary dark:bg-white/10'
}
