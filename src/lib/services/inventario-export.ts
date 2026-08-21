import ExcelJS from 'exceljs'
import { INVENTARIO_COLUMNS } from '@/components/carga-masiva/columns'
import { getInventarioRowsForExport } from '@/lib/dal/inventario-export'

// Exporta inventario_industrial a Excel con las mismas 33 columnas y encabezados
// que la plantilla de carga masiva (el archivo se puede volver a subir por ahí),
// más "ID" al inicio como referencia. Mismo estilo de encabezado que la plantilla.
const INK = '1A1A1A'
const MONEY_COLUMNS = new Set(['precio_total_venta', 'renta_mensual', 'mantenimiento_mensual'])
const UNIT_PRICE_COLUMNS = new Set(['precio_venta_m2', 'precio_renta_m2', 'mantenimiento_m2'])
const AREA_COLUMNS = new Set(['m2_terreno', 'm2_construccion', 'm2_rentables'])

function cellValue(column: string, type: string, raw: unknown): string | number | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (type === 'number') {
    const n = Number(raw)
    return Number.isNaN(n) ? String(raw) : n
  }
  return String(raw)
}

export function exportFileName(date = new Date()): string {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `BRIKA-Inventario-${d}.xlsx`
}

/** Libro Excel con todo el inventario. Devuelve el archivo y el número de filas. */
export async function buildInventarioWorkbook(): Promise<{ buffer: Buffer; rows: number }> {
  const rows = await getInventarioRowsForExport()

  const wb = new ExcelJS.Workbook()
  wb.creator = 'BRIKA CRM'
  wb.created = new Date()
  const ws = wb.addWorksheet('Inventario', { views: [{ state: 'frozen', ySplit: 1 }] })

  ws.columns = [
    { header: 'ID', key: 'id', width: 38 },
    ...INVENTARIO_COLUMNS.map((c) => ({
      header: c.header,
      key: c.dbColumn,
      width: Math.max(c.header.length + 4, c.type === 'number' ? 16 : 18),
    })),
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INK}` } }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.height = 22

  INVENTARIO_COLUMNS.forEach((c, i) => {
    const col = ws.getColumn(i + 2)
    if (MONEY_COLUMNS.has(c.dbColumn) || AREA_COLUMNS.has(c.dbColumn)) col.numFmt = '#,##0'
    else if (UNIT_PRICE_COLUMNS.has(c.dbColumn)) col.numFmt = '#,##0.00'
    else if (c.type === 'date') col.numFmt = '@'
  })

  for (const r of rows) {
    const record: Record<string, string | number | null> = { id: String(r.id ?? '') }
    for (const c of INVENTARIO_COLUMNS) record[c.dbColumn] = cellValue(c.dbColumn, c.type, r[c.dbColumn])
    ws.addRow(record)
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: INVENTARIO_COLUMNS.length + 1 } }

  const out = await wb.xlsx.writeBuffer()
  return { buffer: Buffer.from(out as ArrayBuffer), rows: rows.length }
}
