'use client'

import { ExternalLink, Percent } from 'lucide-react'
import type { Property } from '@/types'
import { formatComisionTexto } from '@/lib/utils/format'
import { ContactAvatar, EmailCell, PhoneCell } from '@/components/contactos/ContactCells'

// La celda de copiar ya cambia su icono a ✓; aquí no hay toast
const noop = () => {}

/**
 * Sección "Contacto" al final del detalle: nombre, celular (llamar /
 * WhatsApp / copiar), correo y comisión. Los campos solo llegan si el
 * usuario tiene `contactos.view` (el API los quita si no).
 */
export function PropertyContactSection({ property, showDrive }: { property: Property; showDrive: boolean }) {
  const { contacto, celular_contacto: celular, correo_contacto: correo, comision } = property
  const hasContact = Boolean(contacto || celular || correo || comision)
  const drive = showDrive ? property.link_drive : null
  if (!hasContact && !drive) return null

  return (
    <div className="py-5 border-t" style={{ borderColor: 'rgba(161, 161, 170,0.15)' }}>
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--text-tertiary)' }}>
        Contacto
      </h3>

      {hasContact && (
        <div className="rounded-[12px] border border-border-primary p-4">
          <div className="flex items-center gap-3">
            <ContactAvatar name={contacto ?? null} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-text-primary truncate">{contacto ?? 'Sin nombre'}</p>
              <p className="text-xs text-text-tertiary truncate">
                {[property.nombre_kibah, 'Desarrollador / propietario'].filter(Boolean).join(' · ')}
              </p>
            </div>
            {comision && (
              <span className="brika-badge brika-badge-preventa inline-flex items-center gap-1 whitespace-nowrap" title="Comisión">
                <Percent className="w-3 h-3" strokeWidth={2} />
                Comisión {formatComisionTexto(comision)}
              </span>
            )}
          </div>

          {(celular || correo) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border-primary text-sm">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1">Celular</p>
                <PhoneCell value={celular ?? null} onCopied={noop} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1">Correo</p>
                <EmailCell value={correo ?? null} onCopied={noop} />
              </div>
            </div>
          )}
        </div>
      )}

      {drive && (
        <a
          href={drive}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-sm text-orange hover:underline ${hasContact ? 'mt-3' : ''}`}
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
          Abrir carpeta en Drive
        </a>
      )}
    </div>
  )
}
