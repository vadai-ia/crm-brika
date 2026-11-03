// Páginas de galería de la ficha: el resto de las fotos visibles de la
// propiedad (la #1 ya va de portada en la página 1), en el orden elegido en
// el CRM, en cuadrícula de 2 × 3 por hoja. Cada foto va completa (fitToBox).

import type { jsPDF } from 'jspdf'
import type { FichaData } from './data'
import { spacedTextRight } from './draw'
import { DIVIDER, GRAY, GRAY_LIGHT, INK, MARGIN, PAGE_H, PAGE_W, PURPLE } from './theme'
import { LOGO_WORDMARK_RATIO } from './assets'

export const GALLERY_COLS = 2
export const GALLERY_ROWS = 3
export const GALLERY_PER_PAGE = GALLERY_COLS * GALLERY_ROWS
/** Proporción de cada celda (3:2, la de casi todas las fotos de naves). */
export const GALLERY_RATIO = 3 / 2

const GAP = 6

export function renderGalleryPage(
  doc: jsPDF,
  ficha: FichaData,
  photos: string[],
  logo: string | null,
  folio: string,
  pageIndex: number,
  pageCount: number
): void {
  const mx = MARGIN
  const cw = PAGE_W - mx * 2

  // === Encabezado (igual que la página 2) ===
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
  const eyebrow = pageCount > 1 ? `GALERÍA · ${pageIndex + 1} DE ${pageCount}` : 'GALERÍA'
  doc.text(eyebrow, mx, y, { charSpace: 0.8 })
  y += 7
  doc.setFontSize(15)
  doc.setTextColor(INK)
  doc.text('Fotografías de la propiedad', mx, y)
  y += 9

  // === Cuadrícula de fotos ===
  const cellW = (cw - GAP * (GALLERY_COLS - 1)) / GALLERY_COLS
  const cellH = cellW / GALLERY_RATIO
  photos.forEach((img, i) => {
    const col = i % GALLERY_COLS
    const row = Math.floor(i / GALLERY_COLS)
    const x = mx + col * (cellW + GAP)
    const cy = y + row * (cellH + GAP)
    try {
      doc.addImage(img, 'JPEG', x, cy, cellW, cellH)
    } catch {
      return
    }
    doc.setDrawColor(DIVIDER)
    doc.setLineWidth(0.2)
    doc.rect(x, cy, cellW, cellH)
  })

  // === Pie (igual que la página 1) ===
  const fy = PAGE_H - 18
  doc.setDrawColor(DIVIDER)
  doc.setLineWidth(0.3)
  doc.line(mx, fy, PAGE_W - mx, fy)
  if (logo) {
    const logoH = 4.5
    doc.addImage(logo, 'PNG', mx, fy + 2.5, logoH * LOGO_WORDMARK_RATIO, logoH, 'brika-logo', 'FAST')
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(INK)
    doc.text('BRIKA', mx, fy + 6.5, { charSpace: 1 })
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(GRAY_LIGHT)
  doc.text(folio, PAGE_W - mx, fy + 6.5, { align: 'right' })
}
