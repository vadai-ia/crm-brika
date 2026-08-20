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

  let cx = x
  let cy = y
  let rows = 1
  for (const chip of chips) {
    const textW = doc.getTextWidth(chip)
    const w = padX + checkW + 1.6 + textW + padX
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
    doc.text(chip, cx + padX + checkW + 1.6, cy + h / 2 + 1.1)
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
