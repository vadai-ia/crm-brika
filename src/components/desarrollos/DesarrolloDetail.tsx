'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Pencil, Trash2, MapPin, Ruler, Bed, Bath, Car, Warehouse, Sparkles } from 'lucide-react'
import type { Desarrollo } from '@/types/desarrollo'
import { DISPONIBILIDAD_COLORS } from '@/lib/utils/constants'
import { toTitleCase } from '@/lib/utils/format'

interface DesarrolloDetailProps {
  desarrollo: Desarrollo
  onClose: () => void
  onEdit?: (d: Desarrollo) => void
  onDelete?: (d: Desarrollo) => void
}

function formatPrice(n: number | null): string {
  if (!n) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function formatRange(min: number | null, max: number | null, suffix = ''): string {
  if (min && max && min !== max) return `${min}${suffix} - ${max}${suffix}`
  if (min && max) return `${min}${suffix}`
  if (min) return `${min}${suffix}`
  if (max) return `${max}${suffix}`
  return '—'
}

function formatPriceRange(min: number | null, max: number | null): string {
  if (min && max && min !== max) return `${formatPrice(min)} - ${formatPrice(max)}`
  if (min && max) return formatPrice(min)
  if (min) return `Desde ${formatPrice(min)}`
  if (max) return `Hasta ${formatPrice(max)}`
  return 'Consultar precio'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="text-sm text-text-primary font-medium mt-0.5">{value || '—'}</dd>
    </div>
  )
}

function IconField({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
      <div>
        <dt className="text-xs text-text-tertiary">{label}</dt>
        <dd className="text-sm text-text-primary font-medium mt-0.5">{value || '—'}</dd>
      </div>
    </div>
  )
}

export function DesarrolloDetail({ desarrollo, onClose, onEdit, onDelete }: DesarrolloDetailProps) {
  const [mainImage, setMainImage] = useState(desarrollo.imagen_principal)

  const images = [desarrollo.imagen_principal, desarrollo.imagen_1, desarrollo.imagen_2, desarrollo.imagen_3]
    .filter((url): url is string => !!url && url.trim().length > 1)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const dispStyle = DISPONIBILIDAD_COLORS[desarrollo.disponibilidad ?? '']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/50"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[720px] max-h-[90vh] overflow-y-auto
          brika-modal-solid border border-border-primary
          rounded-[20px] shadow-xl
          max-md:fixed max-md:inset-0 max-md:max-w-none max-md:max-h-none max-md:rounded-none"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border-primary brika-modal-solid">
          <h2 className="text-lg font-semibold text-text-primary truncate">
            {desarrollo.nombre_kibah || desarrollo.nombre_desarrollador || '—'}
          </h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button onClick={() => { onClose(); onEdit(desarrollo) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-[var(--radius-sm)] hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer">
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} /> Editar
              </button>
            )}
            {onDelete && (
              <button onClick={() => { onClose(); onDelete(desarrollo) }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-[var(--radius-sm)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Eliminar
              </button>
            )}
            <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)] hover:bg-bg-tertiary transition-colors cursor-pointer">
              <X className="w-4 h-4 text-text-secondary" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <div className="px-6 pt-4">
            <img src={mainImage ?? images[0]} alt="" className="w-full h-56 object-cover rounded-[var(--radius-sm)]" />
            {images.length > 1 && (
              <div className="flex gap-2 mt-2">
                {images.map((url, i) => (
                  <button key={i} onClick={() => setMainImage(url)} className={`w-16 h-12 rounded overflow-hidden border-2 cursor-pointer transition-colors ${mainImage === url ? 'border-orange' : 'border-transparent'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 divide-y divide-border-primary">
          {/* Badges + Price */}
          <div className="py-4 flex items-center gap-2 flex-wrap">
            {dispStyle && desarrollo.disponibilidad && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${dispStyle.bg} ${dispStyle.text}`}>{desarrollo.disponibilidad}</span>
            )}
            {desarrollo.tipo_preventa && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400">{toTitleCase(desarrollo.tipo_preventa)}</span>
            )}
            <span className="text-lg font-bold text-text-primary ml-auto">
              {formatPriceRange(desarrollo.precio_min, desarrollo.precio_max)}
            </span>
          </div>

          <Section title="Información General">
            <Field label="Nombre BRIKA" value={desarrollo.nombre_kibah} />
            <Field label="Desarrollo" value={desarrollo.nombre_desarrollador} />
            <Field label="Disponibilidad" value={desarrollo.disponibilidad} />
            <Field label="Tipo Preventa" value={toTitleCase(desarrollo.tipo_preventa)} />
          </Section>

          <Section title="Ubicación">
            <Field label="Dirección (sin número)" value={desarrollo.direccion} />
            <Field label="Dirección BDD (con número)" value={desarrollo.direccion_bdd} />
            <Field label="Colonia" value={toTitleCase(desarrollo.colonia)} />
            <Field label="Alcaldía" value={toTitleCase(desarrollo.alcaldia)} />
            {desarrollo.link_maps && (
              <div>
                <a href={desarrollo.link_maps} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-orange hover:underline">
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} /> Ver en Maps
                </a>
              </div>
            )}
          </Section>

          <div className="py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Características</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <IconField icon={Ruler} label="M² Totales" value={formatRange(desarrollo.m2_totales_min, desarrollo.m2_totales_max, ' m²')} />
              <IconField icon={Bed} label="Recámaras" value={formatRange(desarrollo.recamaras_min, desarrollo.recamaras_max)} />
              <IconField icon={Bath} label="Baños" value={formatRange(desarrollo.banos_min, desarrollo.banos_max)} />
              <IconField icon={Car} label="Estacionamientos" value={formatRange(desarrollo.estacionamientos_min, desarrollo.estacionamientos_max)} />
              <IconField icon={Warehouse} label="Bodega" value={desarrollo.bodega} />
              <IconField icon={Sparkles} label="Amenidades" value={desarrollo.amenidades} />
            </div>
          </div>

          <Section title="Entrega">
            <Field label="Tipo de Entrega" value={desarrollo.tipo_entrega} />
            <Field label="Fecha" value={desarrollo.fecha_entrega} />
          </Section>

          {desarrollo.descripcion && (
            <div className="py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">Descripción</h3>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{desarrollo.descripcion}</p>
            </div>
          )}

          <Section title="Interno">
            <Field label="Contacto" value={desarrollo.contacto_desarrollador} />
            <Field label="Comisión" value={desarrollo.pct_comision ? `${desarrollo.pct_comision}%` : null} />
          </Section>
        </div>
        <div className="h-4" />
      </div>
    </div>
  )
}
