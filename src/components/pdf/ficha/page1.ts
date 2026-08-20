// Página 1 de la ficha: membrete claro con logo, foto de fachada, título
// sobre la foto, barra de acento, franja de estadísticas, descripción y chips.

import type { jsPDF } from 'jspdf'
import type { FichaData } from './data'
import { fadeBottom, drawChips, spacedTextRight } from './draw'
import {
  BG_SOFT, DIVIDER, GRAY, GRAY_LIGHT, INK, MARGIN, PAGE_H, PAGE_W,
  PURPLE, PURPLE_SOFT, TAGLINE_L1, TAGLINE_L2, WHITE,
} from './theme'
import { LOGO_WORDMARK_RATIO } from './assets'

// Membrete claro arriba + foto debajo; juntos conservan el alto del hero
export const BAND_H = 26
export const HERO_H = 114.3 // 4.5 in
export const PHOTO_H = HERO_H - BAND_H

export function renderPage1(
  doc: jsPDF,
  ficha: FichaData,
  heroImg: string | null,
  logo: string | null
): void {
  const mx = MARGIN
  const cw = PAGE_W - mx * 2

  // === Membrete claro: logo + tagline ===
  if (logo) {
    const logoH = 10
    doc.addImage(logo, 'PNG', mx, 8, logoH * LOGO_WORDMARK_RATIO, logoH)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(INK)
    doc.text('BRIKA', mx, 15)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(GRAY)
  spacedTextRight(doc, TAGLINE_L1, PAGE_W - mx, 11.5, 0.5)
  spacedTextRight(doc, TAGLINE_L2, PAGE_W - mx, 15, 0.5)

  // === Foto de fachada (o bloque claro de respaldo) ===
  let photoDrawn = false
  if (heroImg) {
    try {
      doc.addImage(heroImg, 'JPEG', 0, BAND_H, PAGE_W, PHOTO_H)
      photoDrawn = true
    } catch {
      // cae al respaldo claro
    }
  }
  if (photoDrawn) {
    fadeBottom(doc, 0, HERO_H - 58, PAGE_W, 58, 0.88)
  } else {
    doc.setFillColor(BG_SOFT)
    doc.rect(0, BAND_H, PAGE_W, PHOTO_H, 'F')
  }

  // === Título (blanco sobre foto; tinta sobre el respaldo claro) ===
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(photoDrawn ? PURPLE_SOFT : PURPLE)
  doc.text(ficha.eyebrow, mx, HERO_H - 30, { charSpace: 0.7 })

  doc.setFontSize(23)
  doc.setTextColor(photoDrawn ? WHITE : INK)
  const titleLines = (doc.splitTextToSize(ficha.title, cw) as string[]).slice(0, 2)
  let ty = HERO_H - 21 - (titleLines.length - 1) * 9
  for (const line of titleLines) {
    doc.text(line, mx, ty)
    ty += 9
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(photoDrawn ? WHITE : GRAY)
  doc.text(ficha.subtitle, mx, HERO_H - 11)

  // === Barra de acento morado ===
  doc.setFillColor(PURPLE)
  doc.rect(0, HERO_H, PAGE_W, 2.4, 'F')

  // === Franja de estadísticas ===
  const stats = ficha.stats
  let y = HERO_H + 14
  if (stats.length > 0) {
    const colW = cw / stats.length
    stats.forEach((s, i) => {
      const x = mx + colW * i
      doc.setFillColor(PURPLE)
      doc.rect(x, y, 7, 1.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(INK)
      doc.text(s.value, x, y + 9)
      if (s.unit) {
        const vw = doc.getTextWidth(s.value)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(GRAY)
        doc.text(s.unit, x + vw + 1.5, y + 9)
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(GRAY_LIGHT)
      const labelLines = (doc.splitTextToSize(s.label, colW - 5) as string[]).slice(0, 2)
      let ly = y + 14
      for (const line of labelLines) {
        doc.text(line, x, ly, { charSpace: 0.4 })
        ly += 3
      }
      if (s.sub) doc.text(s.sub, x, ly, { charSpace: 0.4 })
    })
    y += 24
    doc.setDrawColor(DIVIDER)
    doc.setLineWidth(0.3)
    doc.line(mx, y, PAGE_W - mx, y)
    y += 10
  }

  // === Descripción ===
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor('#3A3A3A')
  const descLines = doc.splitTextToSize(ficha.description, cw) as string[]
  for (const line of descLines) {
    doc.text(line, mx, y)
    y += 5.6
  }
  y += 7

  // === Chips destacados (respaldo de la fila de fotos adicionales) ===
  if (ficha.chips.length > 0) {
    drawChips(doc, ficha.chips.slice(0, 4), mx, y, cw, 1)
  }

  // === Pie de página ===
  const fy = PAGE_H - 18
  doc.setDrawColor(DIVIDER)
  doc.setLineWidth(0.3)
  doc.line(mx, fy, PAGE_W - mx, fy)
  if (logo) {
    const logoH = 4.5
    doc.addImage(logo, 'PNG', mx, fy + 2.5, logoH * LOGO_WORDMARK_RATIO, logoH)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(INK)
    doc.text('BRIKA', mx, fy + 6.5, { charSpace: 1 })
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(GRAY_LIGHT)
  doc.text('01 / 02', PAGE_W - mx, fy + 6.5, { align: 'right' })
}
