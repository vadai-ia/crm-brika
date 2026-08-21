'use client'

import { useEffect, useCallback } from 'react'
import {
  X,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  Bed,
  Bath,
  Ruler,
  Maximize,
  Trees,
  Car,
  Warehouse,
  FileOutput,
} from 'lucide-react'
import type { Property, UserRole } from '@/types'
import { formatPrice, formatM2, formatComision, capitalize } from '@/lib/utils/format'
import { PropertyDetailGallery } from './PropertyDetailGallery'

interface PropertyDetailProps {
  property: Property
  role: UserRole
  onClose: () => void
  onEdit?: (property: Property) => void
  onDelete?: (property: Property) => void
  /** "Crear PDF": lleva al módulo de fichas con solo esta propiedad. */
  onCreatePdf?: (property: Property) => void
  visibleColumnNames?: Set<string>
}

function hasValue(v: string | number | null | undefined): boolean {
  return v !== null && v !== undefined && v !== ''
}

function disponibilidadBadge(value: string | null | undefined): string {
  if (!value) return ''
  const v = value.toLowerCase()
  if (v.includes('dispon')) return 'brika-badge brika-badge-disponible'
  if (v.includes('apart')) return 'brika-badge brika-badge-apartado'
  if (v.includes('rent')) return 'brika-badge brika-badge-rentado'
  return 'brika-badge brika-badge-disponible'
}

function preventaBadge(value: string | null | undefined): string {
  if (!value) return ''
  const v = value.toLowerCase()
  if (v.includes('inmediata')) return 'brika-badge brika-badge-entrega'
  return 'brika-badge brika-badge-preventa'
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3
      className="mb-3"
      style={{
        fontSize: '13px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-tertiary)',
      }}
    >
      {title}
    </h3>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{label}</dt>
      <dd className="text-[14px] font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  )
}

function IconField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
      <div>
        <dt className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{label}</dt>
        <dd className="text-[14px] font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</dd>
      </div>
    </div>
  )
}

export function PropertyDetail({ property, role, onClose, onEdit, onDelete, onCreatePdf, visibleColumnNames }: PropertyDetailProps) {
  const isAdmin = role === 'admin'
  const show = (col: string) => isAdmin || !visibleColumnNames || visibleColumnNames.has(col)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/propiedades?id=${property.id_propiedad}`
    navigator.clipboard.writeText(url)
  }

  // Collect characteristic fields only if they have values
  const chars: { icon: typeof Bed; label: string; value: string }[] = []
  if (show('m2_totales') && hasValue(property.m2_totales)) {
    chars.push({ icon: Ruler, label: 'M² Totales', value: formatM2(property.m2_totales) })
  }
  if (show('m2_habitables') && hasValue(property.m2_habitables)) {
    chars.push({ icon: Maximize, label: 'M² Habitables', value: formatM2(property.m2_habitables) })
  }
  if (show('m2_exteriores') && hasValue(property.m2_exteriores)) {
    chars.push({ icon: Trees, label: 'M² Exteriores', value: formatM2(property.m2_exteriores) })
  }
  if (show('m2_roof_garden') && hasValue(property.m2_roof_garden)) {
    chars.push({ icon: Trees, label: 'M² Roof/Jardín', value: formatM2(property.m2_roof_garden) })
  }
  if (show('num_recamaras') && hasValue(property.num_recamaras)) {
    chars.push({ icon: Bed, label: 'Recámaras', value: String(property.num_recamaras) })
  }
  if (show('num_banos') && hasValue(property.num_banos)) {
    chars.push({ icon: Bath, label: 'Baños', value: String(property.num_banos) })
  }
  if (show('estacionamiento') && hasValue(property.estacionamiento)) {
    chars.push({ icon: Car, label: 'Estacionamiento', value: String(property.estacionamiento) })
  }
  if (show('bodega') && hasValue(property.bodega)) {
    chars.push({ icon: Warehouse, label: 'Bodega', value: String(property.bodega) })
  }

  // Info general — only show if has value
  const infoFields: { label: string; value: string }[] = []
  if (show('nombre_kibah') && hasValue(property.nombre_kibah)) infoFields.push({ label: 'Parque', value: String(property.nombre_kibah) })
  if (show('nombre_desarrollador') && hasValue(property.nombre_desarrollador)) infoFields.push({ label: 'Desarrollo', value: String(property.nombre_desarrollador) })
  if (show('unidad') && hasValue(property.unidad)) infoFields.push({ label: 'Unidad', value: String(property.unidad) })
  if (show('disponibilidad') && hasValue(property.disponibilidad)) infoFields.push({ label: 'Disponibilidad', value: String(property.disponibilidad) })

  // Ubicación
  const ubicFields: { label: string; value: string }[] = []
  if (show('direccion') && hasValue(property.direccion)) ubicFields.push({ label: 'Dirección', value: String(property.direccion) })
  if (show('colonia') && hasValue(property.colonia)) ubicFields.push({ label: 'Zona / Corredor', value: String(property.colonia) })
  if (show('alcaldia') && hasValue(property.alcaldia)) ubicFields.push({ label: 'Municipio', value: String(property.alcaldia) })

  // Entrega
  const entregaFields: { label: string; value: string }[] = []
  if (show('tipo_preventa') && hasValue(property.tipo_preventa)) entregaFields.push({ label: 'Tipo', value: capitalize(property.tipo_preventa) })
  if (show('tipo_entrega') && hasValue(property.tipo_entrega)) entregaFields.push({ label: 'Estado de Obra', value: String(property.tipo_entrega) })
  if (show('fecha_entrega') && hasValue(property.fecha_entrega)) entregaFields.push({ label: 'Fecha de Entrega', value: String(property.fecha_entrega) })

  // Contacto (admin)
  const contactFields: { label: string; value: React.ReactNode }[] = []
  if (show('contacto_desarrollador') && hasValue(property.contacto_desarrollador)) contactFields.push({ label: 'Contacto Desarrollador', value: String(property.contacto_desarrollador) })
  if (show('pct_comision') && hasValue(property.pct_comision)) contactFields.push({ label: 'Comisión', value: formatComision(property.pct_comision) })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[720px] max-h-[90vh] overflow-y-auto
          brika-modal-solid border border-border-primary
          rounded-[20px] shadow-xl
          max-md:fixed max-md:inset-0 max-md:max-w-none max-md:max-h-none max-md:rounded-none"
      >
        {/* Header — sticky solid */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border-primary brika-modal-solid">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {property.nombre_kibah || property.nombre_desarrollador || '—'}
            </h2>
            {property.unidad && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{property.unidad}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCreatePdf && (
              <button
                onClick={() => onCreatePdf(property)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white
                  bg-orange rounded-[var(--radius-sm)] hover:bg-orange-hover transition-colors cursor-pointer"
                title="Crear la ficha PDF de esta propiedad"
              >
                <FileOutput className="w-3.5 h-3.5" strokeWidth={1.5} />
                Crear PDF
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary
                bg-bg-tertiary rounded-[var(--radius-sm)] hover:bg-border-primary transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
              Copiar link
            </button>
            {property.link_drive && (
              <a
                href={property.link_drive}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white
                  bg-orange rounded-[var(--radius-sm)] hover:bg-orange-hover transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                Drive
              </a>
            )}
            {isAdmin && onEdit && (
              <button
                onClick={() => { onClose(); onEdit(property) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary
                  bg-bg-tertiary rounded-[var(--radius-sm)] hover:text-orange hover:bg-orange/10 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                Editar
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={() => { onClose(); onDelete(property) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary
                  bg-bg-tertiary rounded-[var(--radius-sm)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                Eliminar
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-sm)]
                hover:bg-bg-tertiary transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4 text-text-secondary" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Fotos (orden y visibilidad para la web) */}
          <PropertyDetailGallery propertyId={String(property.id)} />

          {/* Badges + Price */}
          <div className="flex items-center gap-2 flex-wrap pb-5">
            {show('disponibilidad') && property.disponibilidad && (
              <span className={disponibilidadBadge(property.disponibilidad)}>
                {property.disponibilidad}
              </span>
            )}
            {show('tipo_preventa') && property.tipo_preventa && (
              <span className={preventaBadge(property.tipo_preventa)}>
                {capitalize(property.tipo_preventa)}
              </span>
            )}
            {show('precio_unidad') && property.precio_unidad && (
              <span className="text-lg font-bold ml-auto" style={{ color: 'var(--text-primary)' }}>
                {formatPrice(property.precio_unidad)}
              </span>
            )}
          </div>

          {/* Info General */}
          {infoFields.length > 0 && (
            <div className="py-5 border-t" style={{ borderColor: 'rgba(161, 161, 170,0.15)' }}>
              <SectionTitle title="Información General" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {infoFields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
              </div>
            </div>
          )}

          {/* Ubicación */}
          {ubicFields.length > 0 && (
            <div className="py-5 border-t" style={{ borderColor: 'rgba(161, 161, 170,0.15)' }}>
              <SectionTitle title="Ubicación" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {ubicFields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
              </div>
            </div>
          )}

          {/* Características con iconos */}
          {chars.length > 0 && (
            <div className="py-5 border-t" style={{ borderColor: 'rgba(161, 161, 170,0.15)' }}>
              <SectionTitle title="Características" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {chars.map((c) => (
                  <IconField key={c.label} icon={c.icon} label={c.label} value={c.value} />
                ))}
              </div>
              {show('amenidades') && property.amenidades && (
                <div className="mt-4">
                  <Field label="Amenidades" value={property.amenidades} />
                </div>
              )}
            </div>
          )}

          {/* Entrega */}
          {entregaFields.length > 0 && (
            <div className="py-5 border-t" style={{ borderColor: 'rgba(161, 161, 170,0.15)' }}>
              <SectionTitle title="Entrega" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {entregaFields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
              </div>
            </div>
          )}

          {/* Contacto */}
          {contactFields.length > 0 && (
            <div className="py-5 border-t" style={{ borderColor: 'rgba(161, 161, 170,0.15)' }}>
              <SectionTitle title="Contacto" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {contactFields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
                {show('link_drive') && property.link_drive && (
                  <Field
                    label="Link Drive"
                    value={
                      <a href={property.link_drive} target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">
                        Abrir en Drive
                      </a>
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
