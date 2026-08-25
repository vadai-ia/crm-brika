// Primitivas de dibujo compartidas entre las páginas de la ficha.

import { GState, type jsPDF } from 'jspdf'
import { BG_SOFT, DIVIDER, INK, PURPLE } from './theme'

// Degradado negro transparente→opaco sobre el borde inferior de la foto,
// simulado con franjas de opacidad creciente (jsPDF no tiene gradientes).
export function fadeBottom(doc: jsPDF, x: number, y: number, w: number, h: number, maxOpacity = 0.85): void {
  const steps = 46
  const stepH = h / steps
  doc.setFillColor('#000000')
  for (let i = 0; i < steps; i++) {
    const t = (i + 1) / steps
    doc.setGState(new GState({ opacity: maxOpacity * t * t }))
    doc.rect(x, y + stepH * i, w, stepH + 0.15, 'F')
  }
  doc.setGState(new GState({ opacity: 1 }))
}

// Palomita dibujada con líneas: el glifo ✓ no existe en las fuentes estándar
// (WinAnsi) de jsPDF.
function drawCheck(doc: jsPDF, x: number, y: number, s: number): void {
  doc.setDrawColor(PURPLE)
  doc.setLineWidth(0.45)
  doc.line(x, y, x + s * 0.35, y + s * 0.35)
  doc.line(x + s * 0.35, y + s * 0.35, x + s, y - s * 0.55)
}

// Fila(s) de chips tipo píldora. Devuelve la Y siguiente al último renglón.
export function drawChips(
  doc: jsPDF,
  chips: string[],
  x: number,
  y: number,
  maxW: number,
  maxRows: number
): number {
  const h = 7.4
  const padX = 3.6
  const checkW = 2.2
  const gap = 2.6
  const rowGap = 3
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  const fixedW = padX + checkW + 1.6 + padX
  let cx = x
  let cy = y
  let rows = 1
  for (const chip of chips) {
    // Un chip más ancho que la fila completa se recorta con "…" (nunca se
    // sale del margen)
    let label = chip
    if (fixedW + doc.getTextWidth(label) > maxW) {
      while (label.length > 1 && fixedW + doc.getTextWidth(label + '…') > maxW) {
        label = label.slice(0, -1)
      }
      label += '…'
    }
    const w = fixedW + doc.getTextWidth(label)
    if (cx + w > x + maxW) {
      if (rows >= maxRows) break
      rows += 1
      cx = x
      cy += h + rowGap
    }
    doc.setFillColor(BG_SOFT)
    doc.setDrawColor(DIVIDER)
    doc.setLineWidth(0.25)
    doc.roundedRect(cx, cy, w, h, h / 2, h / 2, 'FD')
    drawCheck(doc, cx + padX, cy + h / 2 + 0.5, checkW)
    doc.setTextColor(INK)
    doc.text(label, cx + padX + checkW + 1.6, cy + h / 2 + 1.1)
    cx += w + gap
  }
  return cy + h
}

// jsPDF no considera charSpace al calcular align right/center: el texto se
// desborda. Estas variantes calculan el ancho real y alinean a mano.
function spacedWidth(doc: jsPDF, text: string, charSpace: number): number {
  return doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1)
}

export function spacedTextRight(doc: jsPDF, text: string, xRight: number, y: number, charSpace: number): void {
  doc.text(text, xRight - spacedWidth(doc, text, charSpace), y, { charSpace })
}

export function spacedTextCenter(doc: jsPDF, text: string, xCenter: number, y: number, charSpace: number): void {
  doc.text(text, xCenter - spacedWidth(doc, text, charSpace) / 2, y, { charSpace })
}

// Punto de viñeta (el glifo ● tampoco existe en WinAnsi).
export function drawBullet(doc: jsPDF, x: number, y: number): void {
  doc.setFillColor(PURPLE)
  doc.circle(x, y, 0.8, 'F')
}

/**
 * Ajusta un texto a un ancho máximo: primero reduce el tamaño de fuente (de
 * baseSize hasta minSize) y, si aun así no cabe, recorta con "…". La fuente
 * (familia/estilo) debe estar ya seleccionada en el doc; el caller aplica el
 * tamaño devuelto con setFontSize antes de dibujar.
 */
export function fitTextSize(
  doc: jsPDF,
  text: string,
  maxW: number,
  baseSize: number,
  minSize: number
): { text: string; size: number } {
  for (let size = baseSize; size >= minSize; size -= 0.5) {
    doc.setFontSize(size)
    if (doc.getTextWidth(text) <= maxW) return { text, size }
  }
  doc.setFontSize(minSize)
  let t = text
  while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1)
  return { text: t + '…', size: minSize }
}
