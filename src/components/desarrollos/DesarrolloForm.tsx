'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, HelpCircle } from 'lucide-react'
import type { Desarrollo } from '@/types/desarrollo'
import { ImageUpload } from './ImageUpload'

interface DesarrolloFormProps {
  desarrollo?: Desarrollo | null
  onClose: () => void
  onSuccess: () => void
  onToast: (message: string, type: 'success' | 'error') => void
}

const DISPONIBILIDAD_OPTIONS = ['Disponible', 'Apartado', 'Rentado']
const TIPO_PREVENTA_OPTIONS = ['Preventa', 'Entrega Inmediata']
const TIPO_ENTREGA_OPTIONS = ['Terminado', 'Obra blanca', 'Obra Gris', 'Obra Negra']
const BODEGA_OPTIONS = ['Si', 'No']

type FormData = Record<string, string>

interface FilterOpts {
  colonias: string[]
  alcaldias: string[]
  nombres_kibah: string[]
}

function buildInitial(d?: Desarrollo | null): FormData {
  if (!d) return {}
  const s = (v: unknown) => v != null ? String(v) : ''
  return {
    nombre_kibah: s(d.nombre_kibah), nombre_desarrollador: s(d.nombre_desarrollador),
    disponibilidad: s(d.disponibilidad), tipo_preventa: s(d.tipo_preventa),
    direccion: s(d.direccion), direccion_bdd: s(d.direccion_bdd), colonia: s(d.colonia), alcaldia: s(d.alcaldia),
    precio_min: s(d.precio_min), precio_max: s(d.precio_max),
    m2_totales_min: s(d.m2_totales_min), m2_totales_max: s(d.m2_totales_max),
    recamaras_min: s(d.recamaras_min), recamaras_max: s(d.recamaras_max),
    banos_min: s(d.banos_min), banos_max: s(d.banos_max),
    estacionamientos_min: s(d.estacionamientos_min), estacionamientos_max: s(d.estacionamientos_max),
    bodega: s(d.bodega), amenidades: s(d.amenidades),
    tipo_entrega: s(d.tipo_entrega), fecha_entrega: s(d.fecha_entrega),
    descripcion: s(d.descripcion),
    imagen_principal: s(d.imagen_principal), imagen_1: s(d.imagen_1),
    imagen_2: s(d.imagen_2), imagen_3: s(d.imagen_3),
    contacto_desarrollador: s(d.contacto_desarrollador),
    pct_comision: s(d.pct_comision), link_maps: s(d.link_maps),
  }
}

function toPayload(form: FormData) {
  const num = (k: string) => { const v = form[k]?.trim(); if (!v) return null; const n = parseFloat(v); return isNaN(n) ? null : n }
  const str = (k: string) => form[k]?.trim() || null
  return {
    nombre_kibah: form.nombre_kibah?.trim() || '', nombre_desarrollador: str('nombre_desarrollador'),
    disponibilidad: form.disponibilidad || '', colonia: form.colonia?.trim() || '',
    alcaldia: form.alcaldia?.trim() || '', tipo_preventa: form.tipo_preventa || '',
    direccion: str('direccion'), direccion_bdd: str('direccion_bdd'),
    precio_min: num('precio_min'), precio_max: num('precio_max'),
    m2_totales_min: num('m2_totales_min'), m2_totales_max: num('m2_totales_max'),
    recamaras_min: num('recamaras_min'), recamaras_max: num('recamaras_max'),
    banos_min: num('banos_min'), banos_max: num('banos_max'),
    estacionamientos_min: num('estacionamientos_min'), estacionamientos_max: num('estacionamientos_max'),
    bodega: str('bodega'), amenidades: str('amenidades'),
    tipo_entrega: str('tipo_entrega'), fecha_entrega: str('fecha_entrega'),
    descripcion: form.descripcion?.trim() || '',
    imagen_principal: form.imagen_principal?.trim() || '',
    imagen_1: str('imagen_1'), imagen_2: str('imagen_2'), imagen_3: str('imagen_3'),
    contacto_desarrollador: str('contacto_desarrollador'),
    pct_comision: str('pct_comision'), link_maps: form.link_maps?.trim() || '',
  }
}

export function DesarrolloForm({ desarrollo, onClose, onSuccess, onToast }: DesarrolloFormProps) {
  const isEdit = !!desarrollo
  const [form, setForm] = useState<FormData>(buildInitial(desarrollo))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [filterOpts, setFilterOpts] = useState<FilterOpts>({ colonias: [], alcaldias: [], nombres_kibah: [] })
  const [nombreCustom, setNombreCustom] = useState(false)
  const [coloniaCustom, setColoniaCustom] = useState(false)
  const [alcaldiaCustom, setAlcaldiaCustom] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    fetch('/api/desarrollos/filter-options')
      .then(r => r.json())
      .then(data => {
        const opts: FilterOpts = { colonias: data.colonias ?? [], alcaldias: data.alcaldias ?? [], nombres_kibah: data.nombres_kibah ?? [] }
        setFilterOpts(opts)
        if (desarrollo?.nombre_kibah && !opts.nombres_kibah.includes(desarrollo.nombre_kibah)) setNombreCustom(true)
        if (desarrollo?.colonia && !opts.colonias.includes(desarrollo.colonia)) setColoniaCustom(true)
        if (desarrollo?.alcaldia && !opts.alcaldias.includes(desarrollo.alcaldia)) setAlcaldiaCustom(true)
      })
      .catch(() => {})
  }, [desarrollo?.nombre_kibah, desarrollo?.colonia, desarrollo?.alcaldia])

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrors({})
    const payload = toPayload(form)
    const url = isEdit ? `/api/desarrollos/${desarrollo!.id}` : '/api/desarrollos'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body.details && Array.isArray(body.details)) {
          const fe: Record<string, string> = {}
          for (const d of body.details) { const p = d.path?.[0]; if (p) fe[p] = d.message }
          setErrors(fe)
          onToast('Revisa los campos con errores', 'error')
        } else { onToast(body.error || 'Error al guardar', 'error') }
        return
      }
      onToast(isEdit ? 'Desarrollo actualizado' : 'Desarrollo creado', 'success')
      onSuccess(); onClose()
    } catch { onToast('Error de conexión', 'error') }
    finally { setSubmitting(false) }
  }

  const ic = (k: string) =>
    `w-full h-9 px-3 text-sm rounded-[var(--radius-sm)] border bg-bg-primary text-text-primary placeholder:text-text-tertiary transition-colors ${errors[k] ? 'border-red-500' : 'border-border-primary focus:border-orange'} focus:outline-none focus:ring-1 ${errors[k] ? 'focus:ring-red-500' : 'focus:ring-orange/30'}`
  const sc = (k: string) => `${ic(k)} appearance-none cursor-pointer`

  const rangeHint = <p className="text-[10px] text-text-tertiary mt-1">Si el valor es único (sin rango), solo llena el campo Máx.</p>

  function comboSelect(key: string, options: string[], custom: boolean, setCustom: (v: boolean) => void, label: string) {
    if (custom) {
      return (
        <F label={label} error={errors[key]}>
          <div className="flex gap-2">
            <input className={ic(key)} value={form[key] ?? ''} onChange={e => set(key, e.target.value)} placeholder={`Nuevo ${label.replace(' *', '').toLowerCase()}`} />
            <button type="button" onClick={() => { setCustom(false); set(key, '') }} className="h-9 px-2 text-xs text-text-secondary hover:text-text-primary border border-border-primary rounded-[var(--radius-sm)] whitespace-nowrap cursor-pointer transition-colors">Lista</button>
          </div>
        </F>
      )
    }
    return (
      <F label={label} error={errors[key]}>
        <select className={sc(key)} value={form[key] ?? ''} onChange={e => { if (e.target.value === '__other__') { setCustom(true); set(key, '') } else set(key, e.target.value) }}>
          <option value="">Seleccionar</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
          <option value="__other__">Otro...</option>
        </select>
      </F>
    )
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto flex items-start justify-center">
        <div className="relative bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] w-full max-w-2xl shadow-2xl my-8 mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary">
            <h2 className="text-base font-semibold text-text-primary">{isEdit ? 'Editar Desarrollo' : 'Nuevo Desarrollo'}</h2>
            <button onClick={onClose} className="cursor-pointer text-text-tertiary hover:text-text-primary transition-colors"><X className="w-5 h-5" strokeWidth={1.5} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Info */}
            <Sec title="Información Principal">
              {comboSelect('nombre_kibah', filterOpts.nombres_kibah, nombreCustom, setNombreCustom, 'Nombre BRIKA *')}
              <F label="Nombre Desarrollador" error={errors.nombre_desarrollador}>
                <input className={ic('nombre_desarrollador')} value={form.nombre_desarrollador ?? ''} onChange={e => set('nombre_desarrollador', e.target.value)} />
              </F>
              <div className="grid grid-cols-2 gap-4">
                <F label="Disponibilidad *" error={errors.disponibilidad}>
                  <select className={sc('disponibilidad')} value={form.disponibilidad ?? ''} onChange={e => set('disponibilidad', e.target.value)}>
                    <option value="">Seleccionar</option>
                    {DISPONIBILIDAD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </F>
                <F label="Tipo Preventa *" error={errors.tipo_preventa}>
                  <select className={sc('tipo_preventa')} value={form.tipo_preventa ?? ''} onChange={e => set('tipo_preventa', e.target.value)}>
                    <option value="">Seleccionar</option>
                    {TIPO_PREVENTA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </F>
              </div>
            </Sec>

            {/* Ubicación */}
            <Sec title="Ubicación">
              <div className="grid grid-cols-2 gap-4">
                <F label="Dirección (sin número)" error={errors.direccion}>
                  <input className={ic('direccion')} value={form.direccion ?? ''} onChange={e => set('direccion', e.target.value)} placeholder="ej: Ámsterdam" />
                </F>
                <F label="Dirección BDD (con número)" error={errors.direccion_bdd}>
                  <input className={ic('direccion_bdd')} value={form.direccion_bdd ?? ''} onChange={e => set('direccion_bdd', e.target.value)} placeholder="ej: Ámsterdam 123" />
                </F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {comboSelect('colonia', filterOpts.colonias, coloniaCustom, setColoniaCustom, 'Colonia *')}
                {comboSelect('alcaldia', filterOpts.alcaldias, alcaldiaCustom, setAlcaldiaCustom, 'Alcaldía *')}
              </div>
            </Sec>

            {/* Precios */}
            <Sec title="Precios">
              <div className="grid grid-cols-2 gap-4">
                <F label="Precio Mín" error={errors.precio_min}><input className={ic('precio_min')} type="number" step="any" value={form.precio_min ?? ''} onChange={e => set('precio_min', e.target.value)} /></F>
                <F label="Precio Máx" error={errors.precio_max}><input className={ic('precio_max')} type="number" step="any" value={form.precio_max ?? ''} onChange={e => set('precio_max', e.target.value)} /></F>
              </div>
              {rangeHint}
            </Sec>

            {/* Características */}
            <Sec title="Características">
              <div className="grid grid-cols-2 gap-4">
                <F label="M² Min" error={errors.m2_totales_min}><input className={ic('m2_totales_min')} type="number" step="any" value={form.m2_totales_min ?? ''} onChange={e => set('m2_totales_min', e.target.value)} /></F>
                <F label="M² Max" error={errors.m2_totales_max}><input className={ic('m2_totales_max')} type="number" step="any" value={form.m2_totales_max ?? ''} onChange={e => set('m2_totales_max', e.target.value)} /></F>
              </div>
              {rangeHint}
              <div className="grid grid-cols-2 gap-4">
                <F label="Recámaras Min" error={errors.recamaras_min}><input className={ic('recamaras_min')} type="number" step="any" value={form.recamaras_min ?? ''} onChange={e => set('recamaras_min', e.target.value)} /></F>
                <F label="Recámaras Max" error={errors.recamaras_max}><input className={ic('recamaras_max')} type="number" step="any" value={form.recamaras_max ?? ''} onChange={e => set('recamaras_max', e.target.value)} /></F>
              </div>
              {rangeHint}
              <div className="grid grid-cols-2 gap-4">
                <F label="Baños Min" error={errors.banos_min}><input className={ic('banos_min')} type="number" step="any" value={form.banos_min ?? ''} onChange={e => set('banos_min', e.target.value)} /></F>
                <F label="Baños Max" error={errors.banos_max}><input className={ic('banos_max')} type="number" step="any" value={form.banos_max ?? ''} onChange={e => set('banos_max', e.target.value)} /></F>
              </div>
              {rangeHint}
              <div className="grid grid-cols-2 gap-4">
                <F label="Estacionamientos Min" error={errors.estacionamientos_min}><input className={ic('estacionamientos_min')} type="number" step="any" value={form.estacionamientos_min ?? ''} onChange={e => set('estacionamientos_min', e.target.value)} /></F>
                <F label="Estacionamientos Max" error={errors.estacionamientos_max}><input className={ic('estacionamientos_max')} type="number" step="any" value={form.estacionamientos_max ?? ''} onChange={e => set('estacionamientos_max', e.target.value)} /></F>
              </div>
              {rangeHint}
              <div className="grid grid-cols-2 gap-4">
                <F label="Bodega" error={errors.bodega}>
                  <select className={sc('bodega')} value={form.bodega ?? ''} onChange={e => set('bodega', e.target.value)}><option value="">—</option>{BODEGA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </F>
                <F label="Amenidades" error={errors.amenidades}>
                  <select className={sc('amenidades')} value={form.amenidades ?? ''} onChange={e => set('amenidades', e.target.value)}><option value="">—</option><option value="Si">Si</option><option value="No">No</option></select>
                </F>
              </div>
            </Sec>

            {/* Entrega */}
            <Sec title="Entrega">
              <div className="grid grid-cols-2 gap-4">
                <F label="Tipo de Entrega" error={errors.tipo_entrega}>
                  <select className={sc('tipo_entrega')} value={form.tipo_entrega ?? ''} onChange={e => set('tipo_entrega', e.target.value)}><option value="">—</option>{TIPO_ENTREGA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </F>
                <F label="Fecha de Entrega" error={errors.fecha_entrega}><input className={ic('fecha_entrega')} value={form.fecha_entrega ?? ''} onChange={e => set('fecha_entrega', e.target.value)} placeholder="ej. Q4 2025" /></F>
              </div>
            </Sec>

            {/* Descripción */}
            <Sec title="Descripción">
              <F label="Descripción del Desarrollo *" error={errors.descripcion}>
                <textarea className={`${ic('descripcion')} h-24 py-2 resize-none`} value={form.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
              </F>
            </Sec>

            {/* Imágenes */}
            <Sec title="Imágenes">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <ImageUpload label="Imagen Principal *" currentUrl={form.imagen_principal || null} onUpload={url => set('imagen_principal', url)} onRemove={() => set('imagen_principal', '')} onError={msg => onToast(msg, 'error')} />
                  {errors.imagen_principal && <p className="text-xs text-red-500 mt-0.5">{errors.imagen_principal}</p>}
                </div>
                <ImageUpload label="Imagen 1" currentUrl={form.imagen_1 || null} onUpload={url => set('imagen_1', url)} onRemove={() => set('imagen_1', '')} onError={msg => onToast(msg, 'error')} />
                <ImageUpload label="Imagen 2" currentUrl={form.imagen_2 || null} onUpload={url => set('imagen_2', url)} onRemove={() => set('imagen_2', '')} onError={msg => onToast(msg, 'error')} />
                <ImageUpload label="Imagen 3" currentUrl={form.imagen_3 || null} onUpload={url => set('imagen_3', url)} onRemove={() => set('imagen_3', '')} onError={msg => onToast(msg, 'error')} />
              </div>
            </Sec>

            {/* Código Mapa */}
            <Sec title="Código Mapa">
              <F label="Código Mapa *" error={errors.link_maps}>
                <input className={ic('link_maps')} value={form.link_maps ?? ''} onChange={e => set('link_maps', e.target.value)} placeholder="Código del mapa de Google Maps" />
              </F>
              <div className="flex items-center gap-3 mt-1">
                <a href="https://www.google.com/maps/d/u/0/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-orange hover:text-orange-hover transition-colors">
                  <ExternalLink className="w-3 h-3" strokeWidth={1.5} /> Crear mapa
                </a>
                <a href="https://docs.google.com/presentation/d/1f59sf5vgOldErXwwqtPiKcN-diVkjXJNigzUjoo3z70/edit" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-colors">
                  <HelpCircle className="w-3 h-3" strokeWidth={1.5} /> Instrucciones
                </a>
              </div>
            </Sec>

            {/* Interno */}
            <Sec title="Interno">
              <F label="Contacto Desarrollador" error={errors.contacto_desarrollador}>
                <input className={ic('contacto_desarrollador')} value={form.contacto_desarrollador ?? ''} onChange={e => set('contacto_desarrollador', e.target.value)} />
              </F>
              <F label="% Comisión" error={errors.pct_comision}><input className={ic('pct_comision')} value={form.pct_comision ?? ''} onChange={e => set('pct_comision', e.target.value)} /></F>
            </Sec>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-border-primary">
              <button type="button" onClick={onClose} className="h-9 px-4 text-sm font-medium rounded-[var(--radius-sm)] bg-bg-tertiary text-text-primary hover:bg-border-primary transition-colors cursor-pointer">Cancelar</button>
              <button type="submit" disabled={submitting} className="h-9 px-5 text-sm font-medium rounded-[var(--radius-sm)] bg-orange text-white hover:bg-orange-hover disabled:opacity-50 transition-colors cursor-pointer">
                {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Desarrollo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><h3 className="text-sm font-semibold text-text-primary">{title}</h3>{children}</div>
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>{children}{error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}</div>
}
