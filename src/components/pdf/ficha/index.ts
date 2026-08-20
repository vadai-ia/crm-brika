// Generador de Fichas Técnicas Comerciales BRIKA (2 páginas carta por
// propiedad). Réplica en jsPDF de la plantilla public/pdf/pdf-ficha-tecnica.pdf.

import { jsPDF } from 'jspdf'
import type { Property } from '@/types'
import { LOGO_WORDMARK_SRC, cropToCover, loadImageAsBase64 } from './assets'
import { buildFicha, buildFilename, type FichaData } from './data'
import { PHOTO_H, renderPage1 } from './page1'
import { renderPage2 } from './page2'
import { PAGE_W } from './theme'

export interface FichaPdfResult {
  blob: Blob
  filename: string
}

export async function generateFichaPdf(
  properties: Property[],
  imageMap: Record<string, string>,
  // Fotos de portada adjuntadas manualmente en el builder (dataURL por id);
  // tienen prioridad sobre la imagen de la BD
  coverMap: Record<number, string> = {}
): Promise<FichaPdfResult> {
  const doc = new jsPDF('portrait', 'mm', 'letter')

  const logo = await loadImageAsBase64(LOGO_WORDMARK_SRC)

  const fichas: FichaData[] = []
  let first = true
  for (const property of properties) {
    const ficha = buildFicha(property)
    fichas.push(ficha)

    const cover = coverMap[property.id] ?? null
    const url = imageMap[property.id] ?? null
    const rawImg = cover ?? (url ? await loadImageAsBase64(url) : null)
    const heroImg = rawImg ? await cropToCover(rawImg, PAGE_W / PHOTO_H) : null

    if (!first) doc.addPage()
    first = false
    renderPage1(doc, ficha, heroImg, logo)
    doc.addPage()
    renderPage2(doc, ficha, logo)
  }

  return { blob: doc.output('blob'), filename: buildFilename(fichas) }
}
