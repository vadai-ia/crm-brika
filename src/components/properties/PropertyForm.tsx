'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Property } from '@/types'

interface PropertyFormProps {
  property?: Property | null
  onClose: () => void
  onSuccess: () => void
  onToast: (message: string, type: 'success' | 'error') => void
}

const OPERACION_OPTIONS = ['Venta', 'Renta', 'Preventa', 'Build to Suit']
const ESTATUS_OPTIONS = ['Disponible', 'Apartado', 'Vendido', 'Rentado', 'No disponible']
const PRODUCTO_OPTIONS = ['Nave industrial', 'Lote industrial', 'BTS']
const AREA_BASE_OPTIONS = ['Construcción', 'Terreno']
const MONEDA_OPTIONS = ['MXN', 'USD']

// Campos numéricos de inventario_industrial
const NUMERIC_KEYS = [
  'm2_terreno', 'm2_construccion', 'm2_rentables',
  'precio_venta_m2', 'precio_renta_m2', 'precio_total_venta', 'renta_mensual',
  'mantenimiento_m2', 'mantenimiento_mensual',
]

const TEXT_KEYS = [
  'parque', 'estado', 'municipio', 'zona_corredor', 'producto', 'tipo_producto',
  'unidad', 'operacion', 'estatus', 'area_base_calculo', 'moneda', 'disponibilidad',
  'kva_disponibles', 'altura_libre', 'piso', 'sistema_contra_incendios',
  'certificaciones', 'iluminacion', 'andenes', 'rampas',
  'ultima_actualizacion', 'notas_tecnicas', 'links_imagenes_carpetas_drive', 'ubicacion',
]

type FormData = Record<string, string>

function buildInitial(property?: Property | null): FormData {
  if (!property) return { estado: 'Querétaro', estatus: 'Disponible', moneda: 'MXN' }
  // Las filas mapeadas exponen las columnas reales del inventario; la columna
  // `disponibilidad` viaja bajo el alias `fecha_entrega` (ver lib/utils/inventario).
  const p = property as unknown as Record<string, string | number | null>
  const initial: FormData = {}
  for (const key of TEXT_KEYS) initial[key] = p[key] != null ? String(p[key]) : ''
  for (const key of NUMERIC_KEYS) initial[key] = p[key] != null ? String(p[key]) : ''
  initial.disponibilidad = p.fecha_entrega != null ? String(p.fecha_entrega) : ''
  return initial
}

function toPayload(form: FormData) {
  const payload: Record<string, unknown> = {}
  for (const key of TEXT_KEYS) payload[key] = form[key]?.trim() || null
  for (const key of NUMERIC_KEYS) {
    const v = form[key]?.trim()
    const n = v ? parseFloat(v) : NaN
    payload[key] = isNaN(n) ? null : n
  }
  // Requeridos van como string (Zod valida min(1)); defaults de la tabla
  for (const key of ['parque', 'estado', 'zona_corredor', 'producto', 'unidad', 'operacion']) {
    payload[key] = form[key]?.trim() || ''
  }
  payload.estatus = form.estatus?.trim() || 'Disponible'
  payload.moneda = form.moneda?.trim() || 'MXN'
  return payload
}

interface FilterOptions {
  zonas: string[]
  municipios: string[]
}

export function PropertyForm({ property, onClose, onSuccess, onToast }: PropertyFormProps) {
  const isEdit = !!property
  const [form, setForm] = useState<FormData>(buildInitial(property))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [options, setOptions] = useState<FilterOptions>({ zonas: [], municipios: [] })

  useEffect(() => {
    fetch('/api/properties/filter-options')
      .then((res) => res.json())
      .then((data) => setOptions({ zonas: data.colonias ?? [], municipios: data.alcaldias ?? [] }))
      .catch(() => {})
  }, [])

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})

    const url = isEdit ? `/api/properties/${property!.id}` : '/api/properties'
    try {
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(form)),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.details && Array.isArray(body.details)) {
          const fieldErrors: Record<string, string> = {}
          for (const detail of body.details) {
            const path = detail.path?.[0]
            if (path) fieldErrors[path] = detail.message
          }
          setErrors(fieldErrors)
          onToast('Revisa los campos con errores', 'error')
        } else {
          onToast(body.error || 'Error al guardar', 'error')
        }
        return
      }
      onToast(isEdit ? 'Unidad actualizada' : 'Unidad creada', 'success')
      onSuccess()
      onClose()
    } catch {
      onToast('Error de conexión', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (key: string) =>
    `w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border bg-bg-primary text-text-primary
    placeholder:text-text-tertiary transition-colors
    ${errors[key] ? 'border-red-500' : 'border-border-primary focus:border-orange'}
    focus:outline-none focus:ring-1 ${errors[key] ? 'focus:ring-red-500' : 'focus:ring-orange/30'}`

  const text = (key: string, placeholder = '') => (
    <input className={inputClass(key)} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
  )
  const numberInput = (key: string) => (
    <input className={inputClass(key)} type="number" step="any" value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder="0" />
  )
  const select = (key: string, opts: string[], allowEmpty = true) => (
    <select className={`${inputClass(key)} appearance-none cursor-pointer`} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)}>
      {allowEmpty && <option value="">—</option>}
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
  // Select con opciones existentes en la base + entrada libre vía datalist
  const combo = (key: string, opts: string[], placeholder = '') => (
    <>
      <input className={inputClass(key)} list={`list-${key}`} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
      <datalist id={`list-${key}`}>
        {opts.map((o) => <option key={o} value={o} />)}
      </datalist>
    </>
  )

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto flex items-start justify-center">
      <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-2xl shadow-2xl my-8 mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? 'Editar Unidad' : 'Nueva Unidad'}
          </h2>
          <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <Section title="Identificación">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Parque *" error={errors.parque}>{text('parque', 'ej. Acupark 3')}</Field>
              <Field label="Unidad *" error={errors.unidad}>{text('unidad', 'ej. 95, Bodega 16')}</Field>
              <Field label="Operación *" error={errors.operacion}>{select('operacion', OPERACION_OPTIONS)}</Field>
              <Field label="Estatus" error={errors.estatus}>{select('estatus', ESTATUS_OPTIONS, false)}</Field>
              <Field label="Producto *" error={errors.producto}>{combo('producto', PRODUCTO_OPTIONS)}</Field>
              <Field label="Tipo de Producto" error={errors.tipo_producto}>{combo('tipo_producto', PRODUCTO_OPTIONS)}</Field>
            </div>
          </Section>

          <Section title="Ubicación">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estado *" error={errors.estado}>{combo('estado', ['Querétaro', 'Guanajuato'])}</Field>
              <Field label="Municipio" error={errors.municipio}>{combo('municipio', options.municipios)}</Field>
            </div>
            <Field label="Zona / Corredor *" error={errors.zona_corredor}>{combo('zona_corredor', options.zonas, 'ej. PIQ, Carretera 57 / Aeropuerto')}</Field>
            <Field label="Ubicación (parque / maps)" error={errors.ubicacion}>{text('ubicacion', 'ej. SPARTEK Industrial Park')}</Field>
          </Section>

          <Section title="Superficies">
            <div className="grid grid-cols-2 gap-4">
              <Field label="M² Terreno" error={errors.m2_terreno}>{numberInput('m2_terreno')}</Field>
              <Field label="M² Construcción" error={errors.m2_construccion}>{numberInput('m2_construccion')}</Field>
              <Field label="M² Rentables" error={errors.m2_rentables}>{numberInput('m2_rentables')}</Field>
              <Field label="Área Base de Cálculo" error={errors.area_base_calculo}>{select('area_base_calculo', AREA_BASE_OPTIONS)}</Field>
            </div>
          </Section>

          <Section title="Precios">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Moneda" error={errors.moneda}>{select('moneda', MONEDA_OPTIONS, false)}</Field>
              <Field label="Precio Venta / m²" error={errors.precio_venta_m2}>{numberInput('precio_venta_m2')}</Field>
              <Field label="Precio Total Venta" error={errors.precio_total_venta}>{numberInput('precio_total_venta')}</Field>
              <Field label="Precio Renta / m²" error={errors.precio_renta_m2}>{numberInput('precio_renta_m2')}</Field>
              <Field label="Renta Mensual" error={errors.renta_mensual}>{numberInput('renta_mensual')}</Field>
              <Field label="Mantenimiento / m²" error={errors.mantenimiento_m2}>{numberInput('mantenimiento_m2')}</Field>
              <Field label="Mantenimiento Mensual" error={errors.mantenimiento_mensual}>{numberInput('mantenimiento_mensual')}</Field>
              <Field label="Disponibilidad" error={errors.disponibilidad}>{text('disponibilidad', 'ej. Inmediata, En construcción >80%')}</Field>
            </div>
          </Section>

          <Section title="Características Técnicas">
            <div className="grid grid-cols-2 gap-4">
              <Field label="KVA Disponibles" error={errors.kva_disponibles}>{text('kva_disponibles', 'ej. 5 KVA')}</Field>
              <Field label="Altura Libre" error={errors.altura_libre}>{text('altura_libre', 'ej. 7 m')}</Field>
              <Field label="Piso" error={errors.piso}>{text('piso', 'ej. Concreto MR35 15 cm')}</Field>
              <Field label="Sistema Contra Incendios" error={errors.sistema_contra_incendios}>{text('sistema_contra_incendios')}</Field>
              <Field label="Certificaciones" error={errors.certificaciones}>{text('certificaciones')}</Field>
              <Field label="Iluminación" error={errors.iluminacion}>{text('iluminacion', 'ej. LED')}</Field>
              <Field label="Andenes" error={errors.andenes}>{text('andenes', 'ej. 1')}</Field>
              <Field label="Rampas" error={errors.rampas}>{text('rampas', 'ej. 1')}</Field>
            </div>
          </Section>

          <Section title="Información Adicional">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Última Actualización" error={errors.ultima_actualizacion}>
                <input className={inputClass('ultima_actualizacion')} type="date" value={form.ultima_actualizacion ?? ''} onChange={(e) => set('ultima_actualizacion', e.target.value)} />
              </Field>
              <Field label="Carpeta Drive / Imágenes" error={errors.links_imagenes_carpetas_drive}>{text('links_imagenes_carpetas_drive')}</Field>
            </div>
            <Field label="Notas Técnicas" error={errors.notas_tecnicas}>
              <textarea
                className={`${inputClass('notas_tecnicas')} h-24 py-2 resize-y`}
                value={form.notas_tecnicas ?? ''}
                onChange={(e) => set('notas_tecnicas', e.target.value)}
                placeholder="Muros, techo, cajones de estacionamiento, financiamiento..."
              />
            </Field>
          </Section>

          <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)]
                bg-bg-tertiary text-text-primary hover:bg-border-primary
                transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)]
                bg-orange text-white hover:bg-orange-hover
                disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Unidad'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
