// Generador de Fichas Técnicas Comerciales BRIKA (2 páginas carta por
// propiedad + galería con el resto de sus fotos). Réplica en jsPDF de la
// plantilla public/pdf/pdf-ficha-tecnica.pdf.

import { jsPDF } from 'jspdf'
import type { Property } from '@/types'
import { LOGO_WORDMARK_SRC, fitToBox, loadImageAsBase64 } from './assets'
import { buildFicha, buildFilename, type FichaData } from './data'
import { GALLERY_PER_PAGE, GALLERY_RATIO, renderGalleryPage } from './gallery'
import { PHOTO_H, renderPage1 } from './page1'
import { renderPage2 } from './page2'
import { PAGE_W } from './theme'

export interface FichaPdfResult {
  blob: Blob
  filename: string
}

// Las fotos de la galería ocupan ~89 mm de ancho: 1000 px bastan para
// imprimir y mantienen el PDF ligero (la portada sigue a 1600 px).
const GALLERY_PX = 1000
const GALLERY_QUALITY = 0.82

const pad = (n: number) => String(n).padStart(2, '0')

async function loadGallery(urls: string[]): Promise<string[]> {
  const imgs = await Promise.all(
    urls.map(async (url) => {
      const raw = await loadImageAsBase64(url)
      return raw ? fitToBox(raw, GALLERY_RATIO, GALLERY_PX, GALLERY_QUALITY) : null
    })
  )
  return imgs.filter((img): img is string => img !== null)
}

export async function generateFichaPdf(
  properties: Property[],
  imageMap: Record<string, string>,
  // Fotos de portada adjuntadas manualmente en el builder (dataURL por id);
  // tienen prioridad sobre la imagen de la BD
  coverMap: Record<number, string> = {},
  // Todas las fotos visibles por id, en orden (la #1 = portada)
  photosMap: Record<string, string[]> = {}
): Promise<FichaPdfResult> {
  const doc = new jsPDF('portrait', 'mm', 'letter')

  const logo = await loadImageAsBase64(LOGO_WORDMARK_SRC)

  const fichas: FichaData[] = []
  let first = true
  for (const property of properties) {
    const ficha = buildFicha(property)
    fichas.push(ficha)

    const photos = photosMap[property.id] ?? []
    const manualCover = coverMap[property.id] ?? null
    const coverUrl = photos[0] ?? imageMap[property.id] ?? null
    // Con portada manual, todas las fotos de la BD van a la galería
    const galleryUrls = manualCover ? photos : photos.slice(1)

    const [rawCover, gallery] = await Promise.all([
      manualCover ?? (coverUrl ? loadImageAsBase64(coverUrl) : null),
      loadGallery(galleryUrls),
    ])
    // Foto completa dentro del marco 2.44:1 (antes se recortaba ~40 % al centro)
    const heroImg = rawCover ? await fitToBox(rawCover, PAGE_W / PHOTO_H) : null

    const galleryPages = Math.ceil(gallery.length / GALLERY_PER_PAGE)
    const total = 2 + galleryPages
    const folio = (n: number) => `${pad(n)} / ${pad(total)}`

    if (!first) doc.addPage()
    first = false
    renderPage1(doc, ficha, heroImg, logo, folio(1))
    doc.addPage()
    renderPage2(doc, ficha, logo, folio(2))
    for (let i = 0; i < galleryPages; i++) {
      doc.addPage()
      const pagePhotos = gallery.slice(i * GALLERY_PER_PAGE, (i + 1) * GALLERY_PER_PAGE)
      renderGalleryPage(doc, ficha, pagePhotos, logo, folio(3 + i), i, galleryPages)
    }
  }

  return { blob: doc.output('blob'), filename: buildFilename(fichas) }
}
