import sharp from 'sharp'

// Mismas reglas que scripts/fotos/optimize-images.ps1 (ERROR-JOURNAL #22):
// versión web de máx. 1600 px (JPG q80) y miniatura de 640 px (JPG q75).
// Un original que ya es web (jpg/webp, ≤1600 px y ≤400 KB) se conserva tal cual.
// sharp en Vercel no decodifica HEIC: esas fotos se reportan como omitidas.
const WEB_SIDE = 1600
const WEB_QUALITY = 80
const THUMB_SIDE = 640
const THUMB_QUALITY = 75
const KEEP_RE = /\.(jpe?g|webp)$/i
const KEEP_MAX_BYTES = 400 * 1024
const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

export interface OptimizedImage {
  /** Nombre final (extensión .jpg salvo originales conservados). */
  name: string
  web: { buffer: Buffer; contentType: string }
  thumb: { buffer: Buffer; contentType: string }
  width: number
  height: number
}

export async function optimizeImage(name: string, source: Buffer): Promise<OptimizedImage> {
  const base = sharp(source, { failOn: 'none' }).rotate() // aplica orientación EXIF
  const meta = await base.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!width || !height) throw new Error('formato de imagen no soportado')

  const ext = (name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase()
  const keepOriginal =
    KEEP_RE.test(name) && Math.max(width, height) <= WEB_SIDE && source.length <= KEEP_MAX_BYTES && !meta.orientation

  const thumb = await sharp(source, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
    .toBuffer()

  if (keepOriginal) {
    return {
      name,
      web: { buffer: source, contentType: MIME[ext] ?? 'image/jpeg' },
      thumb: { buffer: thumb, contentType: 'image/jpeg' },
      width,
      height,
    }
  }

  const web = await sharp(source, { failOn: 'none' })
    .rotate()
    .resize({ width: WEB_SIDE, height: WEB_SIDE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: WEB_QUALITY, mozjpeg: true })
    .toBuffer()

  return {
    name: name.replace(/\.[a-z0-9]+$/i, '') + '.jpg',
    web: { buffer: web, contentType: 'image/jpeg' },
    thumb: { buffer: thumb, contentType: 'image/jpeg' },
    width,
    height,
  }
}
