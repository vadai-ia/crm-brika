import {
  AlignmentType, BorderStyle, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
  type IBorderOptions, type IParagraphOptions, type IRunOptions,
} from 'docx'
import { LOGO_WORDMARK_RATIO, LOGO_WORDMARK_SRC, dataUrlToBytes, loadImageAsBase64 } from '@/components/pdf/ficha/assets'
import { buildCartaContent, type CartaContent, type CartaPropuestaData } from './cartaContent'

// Réplica en Word de public/pdf/BRIKA_Plantilla_Carta_Propuesta_Ejemplo.pdf.
// Misma redacción que el PDF (`buildCartaContent`): lo vacío o en 0 no aparece.
const INK = '1A1A1A'
const GRAY = '6B6B6B'
const GRAY_LIGHT = '9A9A9A'
const PURPLE = 'A41BDD'
const DIVIDER = 'E4E1E8'
const FONT = 'Arial'
const MARGIN_TWIPS = 1247 // 22 mm
const CONTENT_TWIPS = 12240 - MARGIN_TWIPS * 2 // carta: 8.5 in = 12240 twips
const LINE = 384 // ≈ 1.6 líneas (240 = sencillo)

const NONE: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE }

const run = (text: string, opts: Partial<IRunOptions> = {}) =>
  new TextRun({ text, font: FONT, size: 20, color: INK, ...opts })

const para = (children: TextRun[] | TextRun, opts: Partial<IParagraphOptions> = {}) =>
  new Paragraph({ spacing: { line: LINE, after: 120 }, children: Array.isArray(children) ? children : [children], ...opts })

const cell = (children: Paragraph[], widthTwips: number, borders = NO_BORDERS) =>
  new TableCell({
    children,
    width: { size: widthTwips, type: WidthType.DXA },
    borders,
    margins: { top: 100, bottom: 100, left: 60, right: 60 },
  })

function headerTable(c: CartaContent, logo: Uint8Array | null): Table {
  const logoW = 113 // px ≈ 30 mm
  const left = logo
    ? new Paragraph({ children: [new ImageRun({ data: logo, transformation: { width: logoW, height: Math.round(logoW / LOGO_WORDMARK_RATIO) }, type: 'png' })] })
    : para(run('BRIKA', { bold: true, size: 36 }))
  const tagline = (t: string) =>
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { line: 240, after: 0 }, children: [run(t, { size: 14, color: GRAY, characterSpacing: 12 })] })
  return new Table({
    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
    columnWidths: [Math.round(CONTENT_TWIPS / 2), Math.round(CONTENT_TWIPS / 2)],
    borders: NO_BORDERS,
    rows: [new TableRow({ children: [cell([left], CONTENT_TWIPS / 2), cell([tagline(c.tagline[0]), tagline(c.tagline[1])], CONTENT_TWIPS / 2)] })],
  })
}

function terminosTable(c: CartaContent): Table {
  const labelW = Math.round(CONTENT_TWIPS * 0.38)
  const valueW = CONTENT_TWIPS - labelW
  const rowBorders = { ...NO_BORDERS, bottom: { style: BorderStyle.SINGLE, size: 4, color: DIVIDER } as IBorderOptions }
  return new Table({
    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
    columnWidths: [labelW, valueW],
    borders: NO_BORDERS,
    rows: c.rows.map(
      (r) =>
        new TableRow({
          children: [
            cell([para(run(r.label, { bold: true }), { spacing: { line: 300, after: 0 } })], labelW, rowBorders),
            cell([para(run(r.value), { spacing: { line: 300, after: 0 } })], valueW, rowBorders),
          ],
        })
    ),
  })
}

function aceptacionTable(c: CartaContent): Table {
  const leftW = Math.round(CONTENT_TWIPS * 0.46)
  const gapW = Math.round(CONTENT_TWIPS * 0.08)
  const rightW = CONTENT_TWIPS - leftW - gapW
  const signed = { ...NO_BORDERS, top: { style: BorderStyle.SINGLE, size: 4, color: INK } as IBorderOptions }
  const label = (t: string) => para(run(t, { size: 17, color: GRAY }), { spacing: { line: 240, after: 0 } })
  return new Table({
    width: { size: CONTENT_TWIPS, type: WidthType.DXA },
    columnWidths: [leftW, gapW, rightW],
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          cell([label(c.aceptacionLabels[0])], leftW, signed),
          cell([new Paragraph({ children: [] })], gapW),
          cell([label(c.aceptacionLabels[1])], rightW, signed),
        ],
      }),
    ],
  })
}

export async function generateCartaDocx(data: CartaPropuestaData): Promise<Blob> {
  const c = buildCartaContent(data)
  const logoB64 = await loadImageAsBase64(LOGO_WORDMARK_SRC)
  const logo = logoB64 ? dataUrlToBytes(logoB64) : null
  const justify = { alignment: AlignmentType.JUSTIFIED }

  const children: Array<Paragraph | Table> = [
    headerTable(c, logo),
    // Regla morada del encabezado
    new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: PURPLE, space: 4 } }, children: [] }),
    para(run(c.fechaLine, { size: 19, color: GRAY }), { alignment: AlignmentType.RIGHT, spacing: { after: 360 } }),
  ]

  // Destinatario
  const dest: TextRun[] = []
  if (c.destinatario.nombre) dest.push(run(c.destinatario.nombre, { bold: true }), run('', { break: 1 }))
  if (c.destinatario.cargo) dest.push(run(c.destinatario.cargo), run('', { break: 1 }))
  if (c.destinatario.empresa) dest.push(run(c.destinatario.empresa), run('', { break: 1 }))
  dest.push(run(c.presente, { color: GRAY }))
  children.push(para(dest, { spacing: { line: LINE, after: 320 } }))

  // Asunto + saludo + párrafos
  children.push(
    para([run(`${c.asuntoLabel} `, { bold: true, color: PURPLE }), run(c.asunto, { bold: true })], { spacing: { line: LINE, after: 320 } }),
    para(run(c.saludo), { spacing: { line: LINE, after: 200 } }),
    ...c.parrafos.map((p) => para(run(p), { ...justify, spacing: { line: LINE, after: 200 } }))
  )

  // Términos
  children.push(
    new Paragraph({
      spacing: { before: 240, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: PURPLE, space: 4 } },
      children: [run(c.terminosTitulo, { bold: true, size: 19, characterSpacing: 16 })],
    }),
    terminosTable(c),
    para(run(c.disclaimer, { italics: true, size: 17, color: GRAY }), { ...justify, spacing: { before: 240, line: 300, after: 280 } }),
    ...c.cierre.map((p) => para(run(p), { ...justify, spacing: { line: LINE, after: 200 } })),
    para(run(c.despedida), { spacing: { line: LINE, before: 120, after: 720 } })
  )

  // Firma BRIKA
  const firma: TextRun[] = []
  if (c.firma.nombre) firma.push(run(c.firma.nombre, { bold: true }), run('', { break: 1 }))
  if (c.firma.cargo) firma.push(run(c.firma.cargo, { size: 19, color: GRAY }), run('', { break: 1 }))
  firma.push(run(c.firma.empresa), run('', { break: 1 }), run(c.firma.contacto, { size: 19, color: GRAY }))
  children.push(para(firma, { spacing: { line: LINE, after: 400 } }))

  // Aceptación
  children.push(
    new Paragraph({ spacing: { after: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: DIVIDER, space: 8 } }, children: [] }),
    para(run(c.aceptacionTitulo, { bold: true, size: 17, color: GRAY, characterSpacing: 16 }), { spacing: { after: 700 } }),
    aceptacionTable(c)
  )

  // Pie
  children.push(
    new Paragraph({ spacing: { before: 600, after: 120 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: DIVIDER, space: 8 } }, children: [] }),
    para(run(c.footer[0], { size: 15, color: GRAY_LIGHT }), { alignment: AlignmentType.CENTER, spacing: { line: 240, after: 60 } }),
    para(run(c.footer[1], { size: 15, color: GRAY_LIGHT }), { alignment: AlignmentType.CENTER, spacing: { line: 240, after: 0 } })
  )

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 20, color: INK } } } },
    sections: [{
      properties: { page: { margin: { top: 1247, bottom: 1000, left: MARGIN_TWIPS, right: MARGIN_TWIPS } } },
      children,
    }],
  })
  return Packer.toBlob(doc)
}
