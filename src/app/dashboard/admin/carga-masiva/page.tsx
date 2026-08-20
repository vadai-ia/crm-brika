'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, Download, FileSpreadsheet, FileUp, Loader2, RefreshCw, Upload,
} from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  INVENTARIO_COLUMNS, autoMapHeaders, diffAgainstCurrent, normalizeKey, validateRows, type RowData,
} from '@/components/carga-masiva/columns'
import { parseAnyFile, type ParsedFile } from '@/components/carga-masiva/parseFile'
import { generateTemplate } from '@/components/carga-masiva/generateTemplate'
import { MapeoStep } from '@/components/carga-masiva/MapeoStep'
import { ReviewStep } from '@/components/carga-masiva/ReviewStep'

type Mode = 'template' | 'libre'
type Step = 'preparar' | 'subir' | 'mapear' | 'revisar' | 'exito'

export default function CargaMasivaPage() {
  const [mode, setMode] = useState<Mode>('template')
  const [step, setStep] = useState<Step>('preparar')
  const [parsed, setParsed] = useState<ParsedFile | null>(null)
  const [rows, setRows] = useState<RowData[]>([])
  const [parsing, setParsing] = useState(false)
  const [inserting, setInserting] = useState(false)
  const [confirmInsert, setConfirmInsert] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((msg: string, t: ToastType) => setToast({ message: msg, type: t }), [])

  const stepLabels = mode === 'libre'
    ? ['Preparar archivo', 'Subir archivo', 'Mapear columnas', 'Revisar datos', 'Confirmar carga']
    : ['Preparar archivo', 'Subir archivo', 'Revisar datos', 'Confirmar carga']
  const stepIndex: Record<Step, number> = mode === 'libre'
    ? { preparar: 0, subir: 1, mapear: 2, revisar: 3, exito: 4 }
    : { preparar: 0, subir: 1, mapear: 1, revisar: 2, exito: 3 }

  const reset = () => {
    setStep('preparar')
    setParsed(null)
    setRows([])
    setResult(null)
  }

  // Convierte filas crudas del archivo a filas keyed por dbColumn, valida y
  // marca duplicados contra la base
  const buildAndValidate = async (map: Record<string, string>, file: ParsedFile) => {
    const raw: RowData[] = []
    for (const r of file.rows) {
      const values: Record<string, string> = {}
      let hasData = false
      for (const def of INVENTARIO_COLUMNS) {
        const header = map[def.dbColumn]
        const v = header ? (r.cells[header] ?? '').trim() : ''
        if (v) hasData = true
        values[def.dbColumn] = v
      }
      if (hasData) raw.push({ row: r.row, values, errors: [], valid: true })
    }
    if (raw.length === 0) {
      showToast('El archivo no tiene datos en las columnas mapeadas', 'error')
      return false
    }

    let validated = validateRows(raw)
    try {
      const items = validated
        .filter((r) => r.values.parque)
        .map((r) => ({
          parque: r.values.parque,
          unidad: r.values.unidad ?? '',
          operacion: r.values.operacion ?? '',
          row: r.row,
        }))
      const res = await fetch('/api/carga-masiva/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (res.ok) {
        const { duplicates } = await res.json()
        const dupMap = new Map(
          (duplicates as Array<{ row: number; current: Record<string, unknown> }>).map((d) => [d.row, d.current])
        )
        // Existente ≠ error: se marca para actualizar y se calcula qué cambia
        validated = validated.map((r) => {
          const current = dupMap.get(r.row)
          if (!current) return r
          const { changedCols, prev } = diffAgainstCurrent(r.values, current)
          return { ...r, exists: true, changedCols, prev }
        })
      }
    } catch { /* sin conexión: continuar sin chequeo */ }

    setRows(validated)
    return true
  }

  const handleFile = async (file: File) => {
    setParsing(true)
    try {
      const pf = await parseAnyFile(file)
      if (pf.rows.length === 0) {
        showToast('El archivo no tiene datos (solo encabezados)', 'error')
        return
      }
      if (mode === 'template') {
        // Los encabezados del template deben estar todos presentes
        const byNorm = new Map(pf.headers.map((h) => [normalizeKey(h), h]))
        const map: Record<string, string> = {}
        const missing: string[] = []
        for (const def of INVENTARIO_COLUMNS) {
          const h = byNorm.get(normalizeKey(def.header))
          if (h) map[def.dbColumn] = h
          else missing.push(def.header)
        }
        if (missing.length > 0) {
          showToast(
            `El archivo no coincide con el template. Faltan columnas: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}. Si es un archivo propio, usa la opción "Tengo un archivo CSV o Excel".`,
            'error'
          )
          return
        }
        if (await buildAndValidate(map, pf)) setStep('revisar')
      } else {
        setParsed(pf)
        setStep('mapear')
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al leer el archivo', 'error')
    } finally {
      setParsing(false)
    }
  }

  const handleMapContinue = async (map: Record<string, string>) => {
    if (!parsed) return
    setParsing(true)
    try {
      if (await buildAndValidate(map, parsed)) setStep('revisar')
    } finally {
      setParsing(false)
    }
  }

  const handleInsert = async () => {
    setConfirmInsert(false)
    setInserting(true)
    try {
      // Nuevas: todos los campos con valor. Actualizaciones: solo los campos
      // que cambian (+ la llave para el match). Sin cambios: no se envían.
      const items = rows
        .filter((r) => r.valid && (!r.exists || (r.changedCols?.length ?? 0) > 0))
        .map((r) => {
          const item: Record<string, string> = {}
          if (r.exists) {
            item.parque = r.values.parque
            item.unidad = r.values.unidad
            item.operacion = r.values.operacion
            for (const c of r.changedCols ?? []) item[c] = r.values[c]
          } else {
            for (const [k, v] of Object.entries(r.values)) {
              if (v) item[k] = v
            }
          }
          return item
        })
      const res = await fetch('/api/carga-masiva/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(body.error || 'Error durante la carga', 'error')
        return
      }
      setResult({ inserted: (body.inserted as number) ?? 0, updated: (body.updated as number) ?? 0 })
      setStep('exito')
    } catch {
      showToast('Error de conexión', 'error')
    } finally {
      setInserting(false)
    }
  }

  const newCount = rows.filter((r) => r.valid && !r.exists).length
  const updateCount = rows.filter((r) => r.valid && r.exists && (r.changedCols?.length ?? 0) > 0).length

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="brika-page-title">Carga Masiva — Inventario</h1>
          <p className="brika-page-desc mt-1">Importa propiedades industriales desde Excel o CSV</p>
        </div>
        {step !== 'preparar' && step !== 'exito' && (
          <button
            onClick={() => (rows.length > 0 ? setConfirmReset(true) : reset())}
            className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Empezar de nuevo
          </button>
        )}
      </div>

      {step !== 'exito' && (
        <div className="flex items-center gap-2 flex-wrap">
          {stepLabels.map((s, i) => {
            const active = stepIndex[step] === i
            const done = stepIndex[step] > i
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-0.5 ${done || active ? 'bg-orange' : 'bg-border-primary'}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  ${active ? 'bg-orange text-white' : done ? 'bg-orange/15 text-orange' : 'bg-bg-tertiary text-text-tertiary'}`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} /> : <span>{i + 1}</span>}
                  <span className="hidden sm:inline">{s}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {step === 'preparar' && (
        <div className="brika-card p-6 space-y-5">
          <h2 className="text-base font-semibold text-text-primary">¿Cómo quieres cargar tu inventario?</h2>
          <ol className="space-y-2 text-sm text-text-secondary">
            <li><strong className="text-text-primary">Con el template</strong> — Descárgalo, llénalo en Excel o Google Sheets (una fila por propiedad, sin modificar encabezados) y súbelo aquí.</li>
            <li><strong className="text-text-primary">Con tu propio archivo</strong> — Sube cualquier Excel o CSV y en el siguiente paso indicas qué columna corresponde a cada campo del inventario.</li>
            <li><strong className="text-text-primary">Campos obligatorios</strong> — Parque, Unidad y Operación (la combinación de los tres no puede repetirse).</li>
          </ol>

          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Campos del inventario</h3>
            <div className="flex flex-wrap gap-2">
              {INVENTARIO_COLUMNS.map((c) => (
                <span key={c.dbColumn} className={`brika-badge ${c.required ? 'brika-badge-preventa' : 'bg-bg-tertiary text-text-tertiary'}`}>
                  {c.header}{c.required ? ' *' : ''}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-border-primary flex-wrap">
            <button onClick={() => generateTemplate()} className="brika-btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}>
              <Download className="w-4 h-4" strokeWidth={1.5} /> Descargar template
            </button>
            <button onClick={() => { setMode('template'); setStep('subir') }} className="brika-btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}>
              <FileUp className="w-4 h-4" strokeWidth={1.5} /> Ya descargué mi template y ya lo llené →
            </button>
            <button onClick={() => { setMode('libre'); setStep('subir') }} className="brika-btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}>
              <FileSpreadsheet className="w-4 h-4" strokeWidth={1.5} /> Tengo un archivo CSV o Excel →
            </button>
          </div>
        </div>
      )}

      {step === 'subir' && (
        <div className="brika-card p-6 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-orange/40 rounded-[var(--radius-sm)] cursor-pointer hover:border-orange hover:bg-orange/5 transition-colors"
          >
            {parsing ? (
              <Loader2 className="w-10 h-10 text-orange animate-spin" strokeWidth={1.5} />
            ) : (
              <Upload className="w-10 h-10 text-orange" strokeWidth={1.5} />
            )}
            <p className="text-sm font-medium text-text-primary">
              {parsing ? 'Procesando archivo...' : 'Arrastra tu archivo aquí o haz click para seleccionar'}
            </p>
            <p className="text-xs text-text-tertiary">
              {mode === 'template' ? 'Formato aceptado: .xlsx (el template)' : 'Formatos aceptados: .xlsx y .csv'}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={mode === 'template' ? '.xlsx' : '.xlsx,.csv'}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
            className="hidden"
          />
          <button onClick={reset} className="text-sm text-text-tertiary hover:text-text-primary cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" strokeWidth={1.5} />Volver
          </button>
        </div>
      )}

      {step === 'mapear' && parsed && (
        <MapeoStep
          parsed={parsed}
          initialMap={autoMapHeaders(parsed.headers)}
          onBack={() => { setParsed(null); setStep('subir') }}
          onContinue={handleMapContinue}
        />
      )}

      {step === 'revisar' && (
        <ReviewStep
          rows={rows}
          inserting={inserting}
          onBack={() => { setRows([]); setStep(mode === 'libre' && parsed ? 'mapear' : 'subir') }}
          onConfirm={() => setConfirmInsert(true)}
        />
      )}

      {step === 'exito' && result !== null && (
        <div className="brika-card p-8 text-center max-w-lg mx-auto space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold text-text-primary">¡Carga exitosa!</h2>
          <p className="text-sm text-text-secondary">
            {result.inserted > 0 && <>Se agregaron <strong>{result.inserted}</strong> propiedades nuevas</>}
            {result.inserted > 0 && result.updated > 0 && ' y '}
            {result.updated > 0 && <>se actualizaron <strong>{result.updated}</strong> existentes</>}
            {result.inserted === 0 && result.updated === 0 && 'No hubo cambios'}
            .
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={reset} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Hacer otra carga
            </button>
            <a href="/dashboard/propiedades" className="brika-btn-primary" style={{ padding: '8px 16px', fontSize: '13px', textDecoration: 'none' }}>
              Ir a Propiedades
            </a>
          </div>
        </div>
      )}

      {confirmInsert && (
        <ConfirmDialog
          title="Confirmar carga"
          message={`Se agregarán ${newCount} propiedades nuevas${updateCount > 0 ? ` y se actualizarán ${updateCount} existentes` : ''}. Esta acción no se puede deshacer. ¿Confirmar?`}
          confirmLabel="Confirmar"
          onConfirm={handleInsert}
          onCancel={() => setConfirmInsert(false)}
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Empezar de nuevo"
          message="¿Empezar de nuevo? Se perderán los datos actuales."
          confirmLabel="Empezar de nuevo"
          variant="danger"
          onConfirm={() => { setConfirmReset(false); reset() }}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
