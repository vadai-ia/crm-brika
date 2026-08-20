import { jsPDF } from 'jspdf'
import { LOGO_WORDMARK_RATIO, LOGO_WORDMARK_SRC, loadImageAsBase64 } from '@/components/pdf/ficha/assets'
import { buildCartaContent, type CartaPropuestaData, type TextSeg } from './cartaContent'

export type { CartaPropuestaData } from './cartaContent'

const INK = '#1A1A1A'
const BODY = '#374151'

interface Ctx {
  doc: jsPDF
  margin: number
  contentW: number
}

function setBody(doc: jsPDF, size = 11) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(BODY)
}

/** Párrafo normal con salto de línea automático. Devuelve la nueva y. */
function writeParagraph(ctx: Ctx, text: string, y: number, lineHeight = 5.2): number {
  const lines = ctx.doc.splitTextToSize(text, ctx.contentW) as string[]
  let cy = y
  for (const line of lines) {
    ctx.doc.text(line, ctx.margin, cy)
    cy += lineHeight
  }
  return cy
}

/** Viñeta con sangría y salto de línea. Devuelve la nueva y. */
function writeBullet(ctx: Ctx, text: string, y: number, lineHeight = 5.2): number {
  const indent = 5
  const lines = ctx.doc.splitTextToSize(text, ctx.contentW - indent) as string[]
  ctx.doc.text('•', ctx.margin, y)
  lines.forEach((line, i) => ctx.doc.text(line, ctx.margin + indent, y + i * lineHeight))
  return y + lines.length * lineHeight + 2.5
}

/** Texto con segmentos en negrita, envuelto palabra por palabra. Devuelve la nueva y. */
function writeRich(ctx: Ctx, segments: TextSeg[], y: number, lineHeight = 4.8): number {
  const { doc, margin, contentW } = ctx
  type Tok = { text: string; bold: boolean }
  const tokens: Tok[] = []
  for (const s of segments) {
    for (const w of s.text.split(/(\s+)/).filter((t) => t.length > 0)) tokens.push({ text: w, bold: s.bold })
  }

  const width = (toks: Tok[]): number =>
    toks.reduce((acc, t) => {
      doc.setFont('helvetica', t.bold ? 'bold' : 'normal')
      return acc + doc.getTextWidth(t.text)
    }, 0)

  let line: Tok[] = []
  let cy = y
  const flush = () => {
    while (line.length && /^\s+$/.test(line[line.length - 1].text)) line.pop()
    let cx = margin
    for (const t of line) {
      doc.setFont('helvetica', t.bold ? 'bold' : 'normal')
      doc.text(t.text, cx, cy)
      cx += doc.getTextWidth(t.text)
    }
    cy += lineHeight
    line = []
  }

  for (const tok of tokens) {
    if (width([...line, tok]) > contentW && line.length > 0) {
      flush()
      if (!/^\s+$/.test(tok.text)) line.push(tok)
    } else {
      line.push(tok)
    }
  }
  if (line.length) flush()
  doc.setFont('helvetica', 'normal')
  return cy
}

/**
 * Genera la Carta Propuesta (PDF carta, 1 página). Los campos vacíos o en 0
 * no aparecen: la redacción viene de `buildCartaContent`.
 */
export async function generateCartaPdf(data: CartaPropuestaData): Promise<Blob> {
  const c = buildCartaContent(data)
  const doc = new jsPDF('portrait', 'mm', 'letter')
  const pw = doc.internal.pageSize.getWidth()
  const margin = 18
  const ctx: Ctx = { doc, margin, contentW: pw - margin * 2 }

  // ---------- Encabezado: logo + fecha ----------
  const logoB64 = await loadImageAsBase64(LOGO_WORDMARK_SRC)
  let y = margin
  if (logoB64) {
    const logoH = 10
    // 'FAST' = deflate del PNG; sin esto jsPDF incrusta los píxeles crudos (~4 MB por carta)
    doc.addImage(logoB64, 'PNG', margin, y, logoH * LOGO_WORDMARK_RATIO, logoH, undefined, 'FAST')
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(INK)
    doc.text('BRIKA', margin, y + 10)
  }
  setBody(doc, 10)
  doc.text(c.fecha, pw - margin, y + 9, { align: 'right' })
  y += 22

  // ---------- Título ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(INK)
  doc.text(c.titulo, pw / 2, y, { align: 'center' })
  y += 10

  // ---------- Cuerpo ----------
  setBody(doc)
  doc.text(c.saludo, margin, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.text(c.asesorLabel, margin, y)
  const lblW = doc.getTextWidth(c.asesorLabel)
  doc.setFont('helvetica', 'normal')
  doc.text(c.asesorNombre, margin + lblW, y)
  y += 10

  y = writeParagraph(ctx, c.intro, y) + 3
  y = writeParagraph(ctx, c.ofrecen, y) + 3

  if (c.valorLine) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(INK)
    doc.text(c.valorLine, margin, y)
    setBody(doc)
    y += 8
  }

  for (const b of c.bullets) y = writeBullet(ctx, b, y)
  y += 6

  // ---------- Documentos ----------
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(INK)
  doc.text(c.documentosTitulo, margin, y)
  y += 6
  setBody(doc, 10)
  y = writeRich(ctx, c.documentos, y)

  // ---------- Firmas ----------
  y += 20
  const lineLen = 70
  const leftX = margin + 5
  const rightX = pw - margin - 5 - lineLen
  doc.setDrawColor(BODY)
  doc.line(leftX, y, leftX + lineLen, y)
  doc.line(rightX, y, rightX + lineLen, y)
  y += 4

  setBody(doc, 9)
  doc.text(c.firmaComprador.label, leftX + lineLen / 2, y, { align: 'center' })
  doc.text(c.firmaPropietario.label, rightX + lineLen / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(INK)
  if (c.firmaComprador.nombre) doc.text(c.firmaComprador.nombre, leftX + lineLen / 2, y, { align: 'center' })
  if (c.firmaPropietario.nombre) doc.text(c.firmaPropietario.nombre, rightX + lineLen / 2, y, { align: 'center' })

  return doc.output('blob')
}
