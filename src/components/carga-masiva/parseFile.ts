// Lectura de archivos de carga masiva: .xlsx (ExcelJS) y .csv (parser propio).
// Devuelve encabezados y filas como strings crudos, sin interpretar columnas.

import ExcelJS from 'exceljs'

export interface ParsedRow {
  row: number
  cells: Record<string, string>
}

export interface ParsedFile {
  headers: string[]
  rows: ParsedRow[]
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ExcelJS puede devolver richText, hyperlinks, fórmulas u objetos Date
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return toDateString(value)
  if (typeof value === 'object') {
    const v = value as unknown as Record<string, unknown>
    if (Array.isArray(v.richText)) {
      return (v.richText as Array<{ text?: string }>).map((t) => t.text ?? '').join('').trim()
    }
    if (typeof v.text === 'string') return v.text.trim()
    if ('result' in v) return cellToString(v.result as ExcelJS.CellValue)
    if ('error' in v) return ''
    return String(value).trim()
  }
  return String(value).trim()
}

// Evita encabezados repetidos ('Precio', 'Precio (2)', ...)
function dedupeHeaders(headers: string[]): string[] {
  const count = new Map<string, number>()
  return headers.map((h) => {
    const base = h || 'Columna'
    const n = (count.get(base) ?? 0) + 1
    count.set(base, n)
    return n === 1 ? base : `${base} (${n})`
  })
}

export async function parseXlsxFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error('El archivo no tiene hojas')

  const rawHeaders: string[] = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, i) => {
    rawHeaders[i - 1] = cellToString(cell.value).replace(/\s*\*\s*$/, '')
  })
  while (rawHeaders.length && !rawHeaders[rawHeaders.length - 1]) rawHeaders.pop()
  if (rawHeaders.filter(Boolean).length === 0) throw new Error('La primera fila no tiene encabezados')
  const headers = dedupeHeaders(rawHeaders)

  const rows: ParsedRow[] = []
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const cells: Record<string, string> = {}
    let hasData = false
    headers.forEach((h, i) => {
      const v = cellToString(row.getCell(i + 1).value)
      if (v) hasData = true
      cells[h] = v
    })
    if (hasData) rows.push({ row: rowNum, cells })
  })
  return { headers, rows }
}

// Parser CSV con soporte de comillas; detecta delimitador (',' o ';')
function parseCsvText(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.slice(0, clean.indexOf('\n') === -1 ? undefined : clean.indexOf('\n'))
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','

  const out: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field); field = ''
      out.push(row); row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); out.push(row) }
  return out
}

export async function parseCsvFile(file: File): Promise<ParsedFile> {
  const text = await file.text()
  const grid = parseCsvText(text)
  if (grid.length === 0) throw new Error('El archivo está vacío')

  const rawHeaders = grid[0].map((h) => h.trim().replace(/\s*\*\s*$/, ''))
  while (rawHeaders.length && !rawHeaders[rawHeaders.length - 1]) rawHeaders.pop()
  if (rawHeaders.filter(Boolean).length === 0) throw new Error('La primera fila no tiene encabezados')
  const headers = dedupeHeaders(rawHeaders)

  const rows: ParsedRow[] = []
  for (let i = 1; i < grid.length; i++) {
    const cells: Record<string, string> = {}
    let hasData = false
    headers.forEach((h, j) => {
      const v = (grid[i][j] ?? '').trim()
      if (v) hasData = true
      cells[h] = v
    })
    if (hasData) rows.push({ row: i + 1, cells })
  }
  return { headers, rows }
}

export async function parseAnyFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return parseCsvFile(file)
  if (name.endsWith('.xlsx')) return parseXlsxFile(file)
  throw new Error('Formato no válido. Solo se aceptan archivos .xlsx o .csv')
}
