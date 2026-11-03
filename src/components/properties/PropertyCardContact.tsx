'use client'

import type { MouseEvent } from 'react'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import type { Property } from '@/types'
import { whatsappUrl } from '@/lib/utils/format'
import { ContactAvatar } from '@/components/contactos/ContactCells'

const ACTION =
  'inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] text-text-tertiary hover:text-orange hover:bg-orange/10 transition-colors'

// Las acciones no deben abrir el detalle de la tarjeta
const stop = (e: MouseEvent) => e.stopPropagation()

/** Contacto compacto al pie de la tarjeta (solo llega si el usuario tiene `contactos.view`). */
export function PropertyCardContact({ property }: { property: Property }) {
  const { contacto, celular_contacto: celular, correo_contacto: correo } = property
  if (!contacto && !celular && !correo) return null
  const wa = whatsappUrl(celular)

  return (
    <div className="mt-auto pt-4">
      <div className="flex items-center gap-2.5 pt-3 border-t border-border-primary">
        <ContactAvatar name={contacto ?? null} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-text-primary truncate">{contacto ?? 'Contacto'}</p>
          <p className="text-[11px] text-text-tertiary truncate tabular-nums">{celular ?? correo}</p>
        </div>
        <div className="flex items-center" onClick={stop}>
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={ACTION} title="WhatsApp" aria-label="Abrir WhatsApp">
              <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
            </a>
          )}
          {celular && (
            <a href={`tel:${celular.replace(/[^\d+]/g, '')}`} className={ACTION} title={`Llamar a ${celular}`} aria-label="Llamar">
              <Phone className="w-4 h-4" strokeWidth={1.5} />
            </a>
          )}
          {correo && (
            <a href={`mailto:${correo}`} className={ACTION} title={correo} aria-label="Enviar correo">
              <Mail className="w-4 h-4" strokeWidth={1.5} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
