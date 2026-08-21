'use client'

import { Loader2, Link as LinkIcon, Info } from 'lucide-react'
import type { CartaFormState, CartaProperty } from '@/types/carta-propuesta'
import { PropertyPicker } from './PropertyPicker'
import { OperacionToggle } from './OperacionToggle'
import { CheckField, NumberField, OPTIONAL_HINT, SectionTitle, TextArea, TextField } from './CartaFormSections'
import { operacionFromInventario } from './cartaFormState'

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

type TextKey = {
  [K in keyof CartaFormState]: CartaFormState[K] extends string ? K : never
}[keyof CartaFormState]

const GRID = 'grid grid-cols-1 md:grid-cols-2 gap-3'

/** Formulario de la Carta Propuesta: mismos campos que la plantilla BRIKA, prellenados desde el inventario. */
export function CartaForm({
  form, onChange, onSelectProperty, focusedKey, setFocusedKey, canGenerate, generating, onGenerate,
}: CartaFormProps) {
  const p = form.selectedProperty
  const esRenta = form.operacion === 'renta'
  const difiereDeInventario = p?.operacion && operacionFromInventario(p.operacion) !== form.operacion
  const prefilled = p ? (
    <span className="text-[11px] font-normal text-text-tertiary flex items-center gap-1">
      <LinkIcon className="w-3 h-3" strokeWidth={1.5} />
      prellenado
    </span>
  ) : null

  const text = (key: TextKey, label: string, placeholder?: string, extra?: { required?: boolean; hint?: string }) => (
    <TextField label={label} value={form[key]} onChange={(v) => onChange(key, v)} placeholder={placeholder} required={extra?.required} hint={extra?.hint} />
  )
  const number = (key: TextKey, label: string, extra?: { hint?: string; suffix?: string }) => (
    <NumberField label={label} id={key} value={form[key]} onChange={(v) => onChange(key, v)} focusedKey={focusedKey} setFocusedKey={setFocusedKey} hint={extra?.hint} suffix={extra?.suffix} />
  )

  return (
    <div className="brika-card p-6 space-y-6 max-w-4xl">
      {/* 1. Propiedad */}
      <section>
        <SectionTitle title="Selecciona una propiedad *" />
        <PropertyPicker selectedId={p?.id ?? null} onSelect={onSelectProperty} />
      </section>

      {/* 2. Tipo de operación */}
      <section>
        <SectionTitle title="Tipo de operación" hint="Cambia la redacción de la carta y los términos que se capturan." />
        <OperacionToggle value={form.operacion} onChange={(v) => onChange('operacion', v)} />
        {difiereDeInventario && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <Info className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
            En el inventario esta propiedad está en <strong className="mx-1">{p?.operacion}</strong>; la carta se generará como {esRenta ? 'renta' : 'compra'}.
          </p>
        )}
      </section>

      {/* 3. Destinatario y cliente */}
      <section>
        <SectionTitle title="Destinatario y cliente" hint="A quién va dirigida la carta y a quién representa BRIKA.">{prefilled}</SectionTitle>
        <div className={GRID}>
          {text('destinatarioNombre', 'Nombre del destinatario', 'Persona a quien va dirigida', { hint: 'Encabeza la carta y el saludo ("Estimado(a) …").' })}
          {text('destinatarioCargo', 'Cargo del destinatario', 'Director Comercial / Representante Legal')}
          {text('destinatarioEmpresa', 'Desarrollo / parque industrial / empresa', 'Nombre del desarrollo o empresa')}
          {text('nombreCliente', 'Cliente representado', 'Nombre del cliente o empresa', { required: true })}
        </div>
      </section>

      {/* 4. Inmueble */}
      <section>
        <SectionTitle title="Inmueble" hint={OPTIONAL_HINT}>{prefilled}</SectionTitle>
        <div className={GRID}>
          <TextArea label="Descripción del inmueble" value={form.inmuebleDescripcion} onChange={(v) => onChange('inmuebleDescripcion', v)} placeholder="Nave / lote — superficie, ubicación general" rows={2} />
          {number('superficie', 'Superficie', { suffix: 'm²', hint: 'Se usa para calcular el precio por m².' })}
          {text('parque', 'Parque', 'Parque industrial')}
          {text('unidad', 'Unidad', 'Nave / lote')}
        </div>
        {p && (p.municipio || p.estado) && (
          <p className="text-[11px] text-text-tertiary mt-2">
            La carta incluirá la ubicación del inventario: {[p.municipio, p.estado].filter(Boolean).join(', ')}.
          </p>
        )}
      </section>

      {/* 5. Términos (cambian con el tipo de operación) */}
      <section>
        <SectionTitle title={esRenta ? 'Términos de la renta' : 'Términos de la compra'} hint={OPTIONAL_HINT} />
        <div className={GRID}>
          {esRenta ? (
            <>
              {number('rentaMensual', 'Renta mensual propuesta', { suffix: 'MXN', hint: 'La carta agrega el precio por m² si hay superficie.' })}
              <CheckField label="Más IVA" checked={form.rentaMasIva} onChange={(v) => onChange('rentaMasIva', v)} hint="Imprime “+ IVA” junto a la renta." />
              {number('plazoAnios', 'Plazo forzoso del contrato', { suffix: 'años' })}
              {number('depositoMeses', 'Depósito en garantía', { suffix: 'meses', hint: 'Se expresa como meses de renta.' })}
              {text('incrementoAnual', 'Incremento anual', 'INPC / % fijo')}
            </>
          ) : (
            <>
              {number('precioCompra', 'Precio de compra propuesto', { suffix: 'MXN', hint: 'La carta agrega el precio por m² si hay superficie.' })}
              {text('formaPago', 'Forma de pago', 'Contado / Enganche + financiamiento a X meses')}
              {number('enganchePct', 'Enganche', { suffix: '%', hint: 'La carta calcula el monto sobre el precio propuesto.' })}
            </>
          )}
        </div>
      </section>

      {/* 6. Condiciones y vigencia */}
      <section>
        <SectionTitle title="Condiciones y vigencia" hint={OPTIONAL_HINT} />
        <div className={GRID}>
          {text('fechaInicio', 'Fecha estimada de inicio / cierre', 'Fecha o "A definir tras aceptación"')}
          {number('vigenciaDias', 'Vigencia de esta propuesta', { suffix: 'días', hint: 'Días naturales a partir de la fecha de expedición.' })}
          <TextArea label="Condiciones especiales" value={form.condicionesEspeciales} onChange={(v) => onChange('condicionesEspeciales', v)} placeholder="Mejoras al inmueble, periodo de gracia, opción a compra, exclusividad… (si aplica)" />
        </div>
      </section>

      {/* 7. Remitente */}
      <section>
        <SectionTitle title="Firma y expedición" />
        <div className={GRID}>
          {text('nombreAsesor', 'Representante de BRIKA', 'Nombre del asesor', { required: true })}
          {text('cargoAsesor', 'Cargo', 'Asesor Comercial')}
          {text('ciudadExpedicion', 'Ciudad de expedición', 'Querétaro')}
          {text('estadoExpedicion', 'Estado de expedición', 'Querétaro')}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-primary">
        <p className="text-xs text-text-tertiary">
          {canGenerate ? 'Lista para generar.' : 'Selecciona una propiedad y captura el cliente y el representante de BRIKA.'}
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
