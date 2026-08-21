import ExcelJS from 'exceljs'
import { INVENTARIO_COLUMNS } from './columns'
import { downloadBlob } from '@/lib/utils/download'

// Header tinta BRIKA (mismo tono que el wordmark)
const INK = '121212'

export async function generateTemplate() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Inventario')

  ws.columns = INVENTARIO_COLUMNS.map((c, i) => ({
    header: c.required ? `${c.header} *` : c.header,
    key: `col_${i}`,
    width: Math.max(c.header.length + 4, 16),
  }))

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${INK}` } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 28

  // Columnas de fecha como texto para que Excel no las auto-convierta
  INVENTARIO_COLUMNS.forEach((c, i) => {
    if (c.type === 'date') ws.getColumn(i + 1).numFmt = '@'
  })

  // Hoja protegida: solo se capturan datos en filas 2+
  ws.protect('', { selectLockedCells: true, selectUnlockedCells: true })
  headerRow.eachCell((cell) => { cell.protection = { locked: true } })
  for (let r = 2; r <= 1000; r++) {
    INVENTARIO_COLUMNS.forEach((_, i) => {
      ws.getCell(r, i + 1).protection = { locked: false }
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, 'Template_Inventario_BRIKA.xlsx')
}
