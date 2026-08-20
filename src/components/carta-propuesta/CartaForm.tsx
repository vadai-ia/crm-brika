'use client'

import { Loader2, Link as LinkIcon, AlertTriangle } from 'lucide-react'
import type { CartaFormState, CartaProperty } from '@/types/carta-propuesta'
import { PropertyPicker } from './PropertyPicker'
import { MoneyField } from './MoneyField'
import { isUrl } from './cartaFormState'

interface CartaFormProps {
  form: CartaFormState
  onChange: <K extends keyof CartaFormState>(key: K, value: CartaFormState[K]) => void
  onSelectProperty: (p: CartaProperty) => void
  focusedKey: string | null
  setFocusedKey: (k: string | null) => void
  canGenerate: boolean
  generating: boolean
  onGenerate: () => void
}

const OPTIONAL_HINT = 'Los campos vacíos o en 0 no aparecen en la carta.'

function TextField({
  label, value, onChange, placeholder, required,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="brika-label">{label}{required ? ' *' : ''}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="brika-input" />
    </div>
  )
}

function SectionTitle({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">{title}{children}</h2>
      {hint && <p className="text-xs text-text-tertiary mt-0.5">{hint}</p>}
    </div>
  )
}

export function CartaForm({
  form, onChange, onSelectProperty, focusedKey, setFocusedKey, canGenerate, generating, onGenerate,
}: CartaFormProps) {
  const p = form.selectedProperty
  // Venta / Preventa → propuesta de compra. Renta / Build to Suit → avisar.
  const esCompra = !p?.operacion || /venta/i.test(p.operacion)
  const ubicacionEsLink = isUrl(p?.ubicacion)

  return (
    <div className="brika-card p-6 space-y-6 max-w-4xl">
      {/* 1. Propiedad */}
      <section>
        <SectionTitle title="Selecciona una propiedad *" />
        <PropertyPicker selectedId={p?.id ?? null} onSelect={onSelectProperty} />
        {p && !esCompra && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-[var(--radius-sm)] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-xs">
              Esta propiedad está en <strong>{p.operacion}</strong>. La carta es una propuesta de compra: captura el valor de la inversión a mano.
            </p>
          </div>
        )}
      </section>

      {/* 2. Asesor + cliente */}
      <section>
        <SectionTitle title="Partes" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField label="Nombre del asesor" required value={form.nombreAsesor} onChange={(v) => onChange('nombreAsesor', v)} placeholder="Nombre del asesor" />
          <TextField label="Nombre del cliente" required value={form.nombreCliente} onChange={(v) => onChange('nombreCliente', v)} placeholder="Nombre completo del comprador" />
        </div>
      </section>

      {/* 3. Datos de la propiedad */}
      <section>
        <SectionTitle title="Datos de la propiedad" hint={OPTIONAL_HINT}>
          {p && (
            <span className="text-[11px] font-normal text-text-tertiary flex items-center gap-1">
              <LinkIcon className="w-3 h-3" strokeWidth={1.5} />
              prellenado
            </span>
          )}
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <TextField label="Dirección" value={form.direccion} onChange={(v) => onChange('direccion', v)} placeholder="Calle, número, colonia…" />
            {ubicacionEsLink && (
              <p className="text-[11px] text-text-tertiary mt-1">
                El inventario solo tiene un <a href={p?.ubicacion ?? '#'} target="_blank" rel="noreferrer" className="text-orange hover:underline">link de Maps</a>; escribe la dirección si la tienes.
              </p>
            )}
          </div>
          <TextField label="Parque" value={form.parque} onChange={(v) => onChange('parque', v)} placeholder="Parque industrial" />
          <TextField label="Unidad" value={form.unidad} onChange={(v) => onChange('unidad', v)} placeholder="Nave / lote" />
          <TextField label="Nombre del desarrollador / propietario" value={form.nombrePropietario} onChange={(v) => onChange('nombrePropietario', v)} placeholder="A quién va dirigida la oferta" />
        </div>
        {p && (p.municipio || p.estado) && (
          <p className="text-[11px] text-text-tertiary mt-2">
            La carta incluirá la ubicación del inventario: {[p.municipio, p.estado].filter(Boolean).join(', ')}.
          </p>
        )}
      </section>

      {/* 4. Datos financieros */}
      <section>
        <SectionTitle title="Datos financieros" hint={OPTIONAL_HINT} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MoneyField label="Valor de la inversión (MXN)" id="valorInversion" value={form.valorInversion} onChange={(v) => onChange('valorInversion', v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} />
          <MoneyField label="Cantidad apartado (MXN)" id="apartado" value={form.apartado} onChange={(v) => onChange('apartado', v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} />
          <MoneyField label="Enganche (MXN)" id="enganche" value={form.enganche} onChange={(v) => onChange('enganche', v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} />
          <MoneyField label="Porcentaje enganche (%)" id="pctEnganche" value={form.pctEnganche} onChange={(v) => onChange('pctEnganche', v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} hint="El saldo restante se calcula como 100 − este porcentaje." />
          <MoneyField label="Mensualidades (número)" id="mensualidades" value={form.mensualidades} onChange={(v) => onChange('mensualidades', v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} />
          <MoneyField label="Monto de cada mensualidad (MXN)" id="montoMensualidades" value={form.montoMensualidades} onChange={(v) => onChange('montoMensualidades', v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} />
          <MoneyField label="Pago a la escritura (MXN)" id="pagoEscritura" value={form.pagoEscritura} onChange={(v) => onChange('pagoEscritura', v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-primary">
        <p className="text-xs text-text-tertiary">
          {canGenerate ? 'Lista para generar.' : 'Selecciona una propiedad y captura asesor y cliente.'}
        </p>
        <button onClick={onGenerate} disabled={!canGenerate || generating} className="brika-btn-primary">
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              Generando...
            </>
          ) : (
            'Generar carta'
          )}
        </button>
      </div>
    </div>
  )
}
