import { jsPDF } from 'jspdf'
import { LOGO_WORDMARK_RATIO, LOGO_WORDMARK_SRC, loadImageAsBase64 } from '@/components/pdf/ficha/assets'
import { spacedTextRight } from '@/components/pdf/ficha/draw'
import { DIVIDER, GRAY, GRAY_LIGHT, INK, PAGE_H, PAGE_W, PURPLE } from '@/components/pdf/ficha/theme'
import { buildCartaContent, type CartaContent, type CartaPropuestaData } from './cartaContent'

export type { CartaPropuestaData } from './cartaContent'

// Réplica de public/pdf/BRIKA_Plantilla_Carta_Propuesta_Ejemplo.pdf (carta, 2 págs.)
const MARGIN = 22
const CONTENT_W = PAGE_W - MARGIN * 2
const LABEL_COL_W = 66
const BOTTOM_LIMIT = PAGE_H - 28
const FOOTER_Y = PAGE_H - 30
const LINE_FACTOR = 1.6
const PT_TO_MM = 25.4 / 72

type Style = 'normal' | 'bold' | 'italic'

class Writer {
  y = 0
  constructor(readonly doc: jsPDF) {}

  font(size: number, style: Style = 'normal', color: string = INK) {
    this.doc.setFont('helvetica', style)
    this.doc.setFontSize(size)
    this.doc.setTextColor(color)
  }

  lineH(size: number): number {
    return size * LINE_FACTOR * PT_TO_MM
  }

  /** Salta de página si no caben `needed` mm. */
  ensure(needed: number) {
    if (this.y + needed > BOTTOM_LIMIT) {
      this.doc.addPage()
      this.y = 24
    }
  }

  /** Párrafo justificado. Devuelve la altura usada. */
  paragraph(text: string, size: number, style: Style = 'normal', color: string = INK, width = CONTENT_W, x = MARGIN): number {
    this.font(size, style, color)
    const lines = this.doc.splitTextToSize(text, width) as string[]
    const h = lines.length * this.lineH(size)
    this.ensure(h)
    this.doc.text(text, x, this.y + size * PT_TO_MM * 0.85, { maxWidth: width, align: 'justify' })
    this.y += h
    return h
  }

  line(text: string, size: number, style: Style = 'normal', color: string = INK, x = MARGIN) {
    this.ensure(this.lineH(size))
    this.font(size, style, color)
    this.doc.text(text, x, this.y + size * PT_TO_MM * 0.85)
    this.y += this.lineH(size)
  }

  rule(color: string, width: number, fromX = MARGIN, toX = PAGE_W - MARGIN) {
    this.doc.setDrawColor(color)
    this.doc.setLineWidth(width)
    this.doc.line(fromX, this.y, toX, this.y)
  }
}

function header(w: Writer, c: CartaContent, logo: string | null) {
  const { doc } = w
  const logoH = 8.5
  if (logo) {
    // 'FAST' = deflate del PNG; sin esto jsPDF incrusta los píxeles crudos (~4 MB por carta)
    doc.addImage(logo, 'PNG', MARGIN, 23, logoH * LOGO_WORDMARK_RATIO, logoH, undefined, 'FAST')
  } else {
    w.font(18, 'bold')
    doc.text('BRIKA', MARGIN, 31)
  }
  w.font(6.8, 'normal', GRAY)
  spacedTextRight(doc, c.tagline[0], PAGE_W - MARGIN, 27.5, 0.6)
  spacedTextRight(doc, c.tagline[1], PAGE_W - MARGIN, 31, 0.6)
  w.y = 36
  w.rule(PURPLE, 0.5)
  w.y = 44
  w.font(9.6, 'normal', GRAY)
  doc.text(c.fechaLine, PAGE_W - MARGIN, w.y + 2.5, { align: 'right' })
  w.y = 57
}

function asunto(w: Writer, c: CartaContent) {
  const { doc } = w
  w.font(10, 'bold', PURPLE)
  const labelW = doc.getTextWidth(`${c.asuntoLabel} `)
  w.font(10, 'bold', INK)
  const lines = doc.splitTextToSize(c.asunto, CONTENT_W - labelW) as string[]
  const lh = w.lineH(10)
  w.ensure(lines.length * lh)
  const baseline = w.y + 10 * PT_TO_MM * 0.85
  w.font(10, 'bold', PURPLE)
  doc.text(c.asuntoLabel, MARGIN, baseline)
  w.font(10, 'bold', INK)
  lines.forEach((l, i) => doc.text(l, MARGIN + labelW, baseline + i * lh))
  w.y += lines.length * lh
}

function terminos(w: Writer, c: CartaContent) {
  const { doc } = w
  w.ensure(30)
  w.font(9.8, 'bold', INK)
  doc.text(c.terminosTitulo, MARGIN, w.y + 3, { charSpace: 0.8 })
  w.y += 6.5
  w.rule(PURPLE, 0.5)
  w.y += 1

  const valueX = MARGIN + LABEL_COL_W
  const valueW = CONTENT_W - LABEL_COL_W - 1
  const lh = w.lineH(10)
  for (const row of c.rows) {
    w.font(10, 'normal', INK)
    const lines = doc.splitTextToSize(row.value, valueW) as string[]
    const rowH = Math.max(1, lines.length) * lh + 4.5
    w.ensure(rowH)
    const baseline = w.y + 3.2 + 10 * PT_TO_MM * 0.85
    w.font(10, 'bold', INK)
    doc.text(row.label, MARGIN + 1, baseline)
    w.font(10, 'normal', INK)
    lines.forEach((l, i) => doc.text(l, valueX, baseline + i * lh))
    w.y += rowH
    w.rule(DIVIDER, 0.3)
  }
  w.y += 7
}

function firma(w: Writer, c: CartaContent) {
  w.ensure(58)
  w.line(c.despedida, 10)
  w.y += 16
  if (c.firma.nombre) w.line(c.firma.nombre, 10, 'bold')
  if (c.firma.cargo) w.line(c.firma.cargo, 9.6, 'normal', GRAY)
  w.line(c.firma.empresa, 10)
  w.line(c.firma.contacto, 9.6, 'normal', GRAY)
}

function aceptacion(w: Writer, c: CartaContent) {
  const { doc } = w
  w.y += 10
  w.ensure(44)
  w.rule(DIVIDER, 0.3)
  w.y += 8
  w.font(8.7, 'bold', GRAY)
  doc.text(c.aceptacionTitulo, MARGIN, w.y, { charSpace: 0.8 })
  w.y += 22
  const leftEnd = MARGIN + 80
  const rightStart = MARGIN + 93
  doc.setDrawColor(INK)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, w.y, leftEnd, w.y)
  doc.line(rightStart, w.y, PAGE_W - MARGIN, w.y)
  w.y += 4.5
  w.font(8.6, 'normal', GRAY)
  doc.text(c.aceptacionLabels[0], MARGIN, w.y)
  doc.text(c.aceptacionLabels[1], rightStart, w.y)
}

function footer(w: Writer, c: CartaContent) {
  const { doc } = w
  if (w.y > FOOTER_Y - 6) {
    doc.addPage()
  }
  w.y = FOOTER_Y
  w.rule(DIVIDER, 0.3)
  w.font(7.6, 'normal', GRAY_LIGHT)
  doc.text(c.footer[0], PAGE_W / 2, FOOTER_Y + 6, { align: 'center' })
  doc.text(c.footer[1], PAGE_W / 2, FOOTER_Y + 11, { align: 'center' })
}

/** Genera la Carta Propuesta (PDF carta) con la plantilla BRIKA. Lo vacío o en 0 no aparece. */
export async function generateCartaPdf(data: CartaPropuestaData): Promise<Blob> {
  const c = buildCartaContent(data)
  const doc = new jsPDF('portrait', 'mm', 'letter')
  doc.setLineHeightFactor(LINE_FACTOR)
  const w = new Writer(doc)

  header(w, c, await loadImageAsBase64(LOGO_WORDMARK_SRC))

  // Destinatario
  if (c.destinatario.nombre) w.line(c.destinatario.nombre, 10, 'bold')
  if (c.destinatario.cargo) w.line(c.destinatario.cargo, 10)
  if (c.destinatario.empresa) w.line(c.destinatario.empresa, 10)
  w.line(c.presente, 10, 'normal', GRAY)
  w.y += 7

  asunto(w, c)
  w.y += 7
  w.line(c.saludo, 10)
  w.y += 4

  for (const p of c.parrafos) {
    w.paragraph(p, 10)
    w.y += 4
  }
  w.y += 3

  terminos(w, c)

  w.paragraph(c.disclaimer, 8.8, 'italic', GRAY)
  w.y += 7
  for (const p of c.cierre) {
    w.paragraph(p, 10)
    w.y += 4
  }
  w.y += 2

  firma(w, c)
  aceptacion(w, c)
  footer(w, c)

  return doc.output('blob')
}
