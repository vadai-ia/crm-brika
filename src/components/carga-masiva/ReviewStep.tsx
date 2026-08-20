'use client'

import ExcelJS from 'exceljs'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { INVENTARIO_COLUMNS, type RowData } from './columns'

interface ReviewStepProps {
  rows: RowData[]
  inserting: boolean
  onBack: () => void
  onConfirm: () => void
}

async function generateErrorReport(rows: RowData[]) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Errores')
  ws.columns = [
    { header: 'Fila', key: 'row', width: 8 },
    ...INVENTARIO_COLUMNS.map((c) => ({ header: c.header, key: c.dbColumn, width: 18 })),
    { header: 'Error', key: 'error', width: 50 },
  ]
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF121212' } }

  for (const r of rows.filter((r) => !r.valid)) {
    const rowData: Record<string, unknown> = { row: r.row, error: r.errors.join('; ') }
    for (const c of INVENTARIO_COLUMNS) rowData[c.dbColumn] = r.values[c.dbColumn] ?? ''
    ws.addRow(rowData)
  }
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Reporte_Errores.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

export function ReviewStep({ rows, inserting, onBack, onConfirm }: ReviewStepProps) {
  const validCount = rows.filter((r) => r.valid).length
  const errorCount = rows.length - validCount
  const newCount = rows.filter((r) => r.valid && !r.exists).length
  const updateCount = rows.filter((r) => r.valid && r.exists && (r.changedCols?.length ?? 0) > 0).length
  const unchangedCount = rows.filter((r) => r.valid && r.exists && (r.changedCols?.length ?? 0) === 0).length

  // Solo columnas con al menos un dato, para no mostrar 30+ columnas vacías
  const visibleCols = INVENTARIO_COLUMNS.filter(
    (c) => c.required || rows.some((r) => r.values[c.dbColumn])
  )

  return (
    <div className="space-y-4">
      <div className="brika-card p-4 flex items-center gap-4 flex-wrap">
        <div className="text-sm text-text-primary font-medium">
          <FileSpreadsheet className="w-4 h-4 inline mr-1 text-text-tertiary" strokeWidth={1.5} />
          {rows.length} registros encontrados
        </div>
        <span className="brika-badge brika-badge-active">{newCount} se agregarán</span>
        {updateCount > 0 && <span className="brika-badge brika-badge-preventa">{updateCount} se actualizarán</span>}
        {unchangedCount > 0 && <span className="brika-badge bg-bg-tertiary text-text-tertiary">{unchangedCount} sin cambios</span>}
        {errorCount > 0 && <span className="brika-badge brika-badge-inactive">{errorCount} con errores</span>}
      </div>

      {updateCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-sm)] bg-orange/10 border border-orange/20">
          <RefreshCw className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-sm text-orange font-medium">
              {updateCount} {updateCount === 1 ? 'propiedad ya existe' : 'propiedades ya existen'} en el inventario y se actualizarán — las celdas resaltadas muestran el cambio (antes → ahora)
            </p>
            <p className="text-xs text-orange/80 mt-0.5">Solo se modifican los campos resaltados; las celdas vacías del archivo no borran datos existentes</p>
          </div>
        </div>
      )}

      {unchangedCount > 0 && updateCount === 0 && newCount === 0 && errorCount === 0 && (
        <div className="p-4 rounded-[var(--radius-sm)] bg-bg-tertiary border border-border-primary">
          <p className="text-sm text-text-secondary">Todas las filas son idénticas a lo que ya está en el inventario — no hay nada que cargar.</p>
        </div>
      )}

      {errorCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius-sm)] bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Corrige los errores antes de continuar</p>
            <p className="text-xs text-red-500/80 mt-0.5">Puedes descargar un reporte de errores o subir un archivo corregido</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-border-primary max-h-[50vh]">
        <table className="brika-table text-xs">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th style={{ width: '40px' }}>#</th>
              <th style={{ width: '90px' }}>Acción</th>
              {visibleCols.map((c) => <th key={c.dbColumn} className="whitespace-nowrap">{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.row} className={!r.valid ? 'bg-red-500/5' : ''}>
                <td>{r.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} /> : <XCircle className="w-4 h-4 text-red-500" strokeWidth={1.5} />}</td>
                <td className="text-text-tertiary">{r.row}</td>
                <td>
                  {!r.valid ? (
                    <span className="text-text-tertiary">—</span>
                  ) : !r.exists ? (
                    <span className="brika-badge brika-badge-active">Agregar</span>
                  ) : (r.changedCols?.length ?? 0) > 0 ? (
                    <span className="brika-badge brika-badge-preventa">Actualizar</span>
                  ) : (
                    <span className="brika-badge bg-bg-tertiary text-text-tertiary">Sin cambios</span>
                  )}
                </td>
                {visibleCols.map((c) => {
                  const changed = r.valid && r.exists && r.changedCols?.includes(c.dbColumn)
                  if (!changed) {
                    return (
                      <td key={c.dbColumn} className="whitespace-nowrap max-w-[200px] truncate">
                        {r.values[c.dbColumn] || <span className="text-text-tertiary">—</span>}
                      </td>
                    )
                  }
                  const antes = r.prev?.[c.dbColumn] || '—'
                  return (
                    <td
                      key={c.dbColumn}
                      className="whitespace-nowrap max-w-[240px] truncate bg-orange/10"
                      title={`Antes: ${antes} — Ahora: ${r.values[c.dbColumn]}`}
                    >
                      <span className="line-through text-text-tertiary">{antes}</span>
                      <span className="text-orange font-semibold"> → {r.values[c.dbColumn]}</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errorCount > 0 && (
        <div className="space-y-1">
          {rows.filter((r) => !r.valid).slice(0, 20).map((r) => (
            <p key={r.row} className="text-xs text-red-500">
              <strong>Fila {r.row}:</strong> {r.errors.join('; ')}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border-primary">
        <button onClick={onBack} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          ← Volver
        </button>
        {errorCount > 0 && (
          <button onClick={() => generateErrorReport(rows)} className="brika-btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Download className="w-4 h-4" strokeWidth={1.5} /> Descargar reporte de errores
          </button>
        )}
        <button
          onClick={onConfirm}
          disabled={errorCount > 0 || newCount + updateCount === 0 || inserting}
          className="brika-btn-primary"
          style={{ padding: '8px 20px', fontSize: '13px' }}
        >
          {inserting
            ? <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> Procesando...</>
            : `Confirmar (${newCount} nuevas${updateCount > 0 ? `, ${updateCount} actualizaciones` : ''})`}
        </button>
      </div>
    </div>
  )
}
