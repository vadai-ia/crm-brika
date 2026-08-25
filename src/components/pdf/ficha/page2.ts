// Página 2 de la ficha: información técnica en cuadrícula, bloque comercial,
// chips de amenidades, ubicación (círculos concéntricos — nunca un mapa real)
// y pie institucional claro.

import type { jsPDF } from 'jspdf'
import type { FichaData, FichaSection } from './data'
import { drawBullet, drawChips, fitTextSize, spacedTextCenter, spacedTextRight } from './draw'
import {
  BG_SOFT, CONTACT_EMAIL, CONTACT_PHONE, DIVIDER, GRAY, GRAY_LIGHT, INK,
  LEGAL, MARGIN, PAGE_H, PAGE_W, PURPLE, TAGLINE_FULL,
} from './theme'
import { LOGO_WORDMARK_RATIO } from './assets'

const FOOTER_H = 30

function drawSection(doc: jsPDF, s: FichaSection, x: number, y: number, w: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(PURPLE)
  doc.text(s.title, x, y, { charSpace: 0.8 })
  doc.setDrawColor(INK)
  doc.setLineWidth(0.7)
  doc.line(x, y + 2.2, x + w, y + 2.2)

  let ry = y + 8.5
  for (const row of s.rows) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(GRAY)
    doc.text(row.label, x, ry)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(INK)
    const valueLines = (doc.splitTextToSize(row.value, w * 0.55) as string[]).slice(0, 3)
    for (const line of valueLines) {
      doc.text(line, x + w, ry, { align: 'right' })
      ry += 4.4
    }
    ry += 2.6
  }
  return ry - y
}

export function renderPage2(doc: jsPDF, ficha: FichaData, logo: string | null): void {
  const mx = MARGIN
  const cw = PAGE_W - mx * 2

  // === Encabezado ===
  if (logo) {
    const logoH = 8
    doc.addImage(logo, 'PNG', mx, 11.5, logoH * LOGO_WORDMARK_RATIO, logoH, 'brika-logo', 'FAST')
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(INK)
    doc.text('BRIKA', mx, 19)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(GRAY)
  spacedTextRight(doc, ficha.headerRight[0], PAGE_W - mx, 15.5, 0.6)
  if (ficha.headerRight[1]) {
    spacedTextRight(doc, ficha.headerRight[1], PAGE_W - mx, 19, 0.6)
  }

  // === Título de sección ===
  let y = 36
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(PURPLE)
  doc.text('INFORMACIÓN TÉCNICA', mx, y, { charSpace: 0.8 })
  y += 7
  doc.setFontSize(15)
  doc.setTextColor(INK)
  doc.text('Especificaciones, logística e infraestructura', mx, y)
  if (ficha.dispLine) {
    y += 5.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(GRAY)
    doc.text(ficha.dispLine, mx, y)
  }
  y += 10

  // === Cuadrícula de secciones (2 columnas) ===
  const gapX = 12
  const colW = (cw - gapX) / 2
  for (let i = 0; i < ficha.sections.length; i += 2) {
    const hL = drawSection(doc, ficha.sections[i], mx, y, colW)
    const hR = i + 1 < ficha.sections.length
      ? drawSection(doc, ficha.sections[i + 1], mx + colW + gapX, y, colW)
      : 0
    y += Math.max(hL, hR) + 7
  }
  y += 2

  // === Bloque comercial (tarjeta clara con acento morado) ===
  const cells = ficha.commercial
  if (cells.length > 0) {
    const blockH = 26
    doc.setFillColor(BG_SOFT)
    doc.setDrawColor(DIVIDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(mx, y, cw, blockH, 2.5, 2.5, 'FD')
    const cellW = (cw - 16) / cells.length
    cells.forEach((c, i) => {
      const x = mx + 8 + cellW * i
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(GRAY)
      doc.text(c.label, x, y + 8, { charSpace: 0.5 })
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(c.highlight ? PURPLE : INK)
      const vFit = fitTextSize(doc, c.value, cellW - 6, c.highlight ? 14 : 11.5, 8)
      doc.setFontSize(vFit.size)
      doc.text(vFit.text, x, y + 16)
      if (c.sub) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(GRAY)
        doc.text(c.sub, x, y + 21)
      }
    })
    y += blockH + 8
  }

  // === Chips de amenidades ===
  if (ficha.chips.length > 0) {
    y = drawChips(doc, ficha.chips, mx, y, cw, 2) + 9
  }

  // === Ubicación estratégica ===
  const locTop = y
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(PURPLE)
  doc.text('UBICACIÓN ESTRATÉGICA', mx, y, { charSpace: 0.8 })
  y += 6.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor('#3A3A3A')
  const parW = cw * 0.55
  const parLines = doc.splitTextToSize(ficha.locationParagraph, parW) as string[]
  for (const line of parLines) {
    doc.text(line, mx, y)
    y += 4.8
  }
  y += 3
  doc.setFontSize(8.5)
  for (const b of ficha.locationBullets) {
    drawBullet(doc, mx + 1.2, y - 1)
    doc.setTextColor('#3A3A3A')
    doc.text(b, mx + 5, y)
    y += 5
  }

  // Círculos concéntricos (zona de influencia). El tope evita que la leyenda
  // inferior invada el pie cuando las secciones de arriba crecen.
  const ccx = mx + cw * 0.8
  const ccy = Math.min(locTop + 24, PAGE_H - FOOTER_H - 33)
  // Tonos lila decrecientes hacia afuera (la opacidad de trazo no es fiable
  // en todos los visores; colores sólidos dan el mismo efecto)
  const radii: Array<[number, string]> = [[24, '#EFDCFA'], [17.5, '#D9A9F2'], [11, '#B44FE4']]
  for (const [r, color] of radii) {
    doc.setDrawColor(color)
    doc.setLineWidth(0.4)
    doc.circle(ccx, ccy, r, 'S')
  }
  doc.setFillColor(PURPLE)
  doc.circle(ccx, ccy, 1.6, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(GRAY_LIGHT)
  if (ficha.locationLabel) {
    spacedTextCenter(doc, ficha.locationLabel, ccx, locTop - 3.5, 0.4)
  }
  doc.text('Zona de influencia aproximada', ccx, ccy + 29, { align: 'center' })

  // === Pie institucional claro ===
  const fy = PAGE_H - FOOTER_H
  doc.setDrawColor(DIVIDER)
  doc.setLineWidth(0.3)
  doc.line(mx, fy, PAGE_W - mx, fy)
  if (logo) {
    const logoH = 8
    doc.addImage(logo, 'PNG', mx, fy + 4.5, logoH * LOGO_WORDMARK_RATIO, logoH, 'brika-logo', 'FAST')
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(INK)
    doc.text('BRIKA', mx, fy + 11)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(GRAY)
  doc.text(TAGLINE_FULL, mx, fy + 17.5, { charSpace: 0.5 })

  doc.setFontSize(8.5)
  doc.setTextColor(INK)
  doc.text(CONTACT_EMAIL, PAGE_W - mx, fy + 10, { align: 'right' })
  doc.text(CONTACT_PHONE, PAGE_W - mx, fy + 15, { align: 'right' })

  doc.setFontSize(6)
  doc.setTextColor(GRAY_LIGHT)
  doc.text(LEGAL, PAGE_W / 2, fy + 26, { align: 'center' })

  // Folio
  doc.setFontSize(6.5)
  doc.text('02 / 02', PAGE_W - mx, fy + 21, { align: 'right' })
}
