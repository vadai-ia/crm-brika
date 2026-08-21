// Carpetas de Google Drive compartidas como "Cualquier persona con el enlace →
// Lector", sin OAuth: listado vía la vista embebida y descarga directa.
// Versión servidor (sin disco) de scripts/fotos/drive.cjs; ver ERROR-JOURNAL #21.

export interface DriveEntry {
  id: string
  name: string
  isFolder: boolean
  children?: DriveFolder
}

export interface DriveFolder {
  id: string
  public: boolean
  title: string
  reason?: string
  entries: DriveEntry[]
}

export interface DriveFile {
  id: string
  title: string
  /** Ruta de subcarpeta (p. ej. "PIA TLC/"), vacía en la raíz. */
  sub: string
}

export interface DownloadedFile {
  name: string
  contentType: string
  buffer: Buffer
}

const SKIP_RE = /\.(ai|psd|pdf|docx?|xlsx?|txt|zip|rar|mp4|mov)$/i
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heic',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/tiff': '.tif',
}
const UA = { 'User-Agent': 'Mozilla/5.0' }
const MAX_DEPTH = 3

export function folderIdFromUrl(url: string | null | undefined): string | null {
  return (String(url ?? '').match(/\/folders\/([A-Za-z0-9_-]+)/) || [])[1] ?? null
}

/** Lista una carpeta pública, recursivo hasta 3 niveles. */
export async function listFolder(id: string, depth = 0): Promise<DriveFolder> {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, {
    redirect: 'manual',
    headers: UA,
    cache: 'no-store',
  })
  if (r.status >= 300 && r.status < 400) {
    return { id, public: false, title: '', reason: 'la carpeta es privada (pide iniciar sesión)', entries: [] }
  }
  const html = await r.text()
  if (r.status !== 200 || /accounts\.google\.com|ServiceLogin|You need access/i.test(html)) {
    return { id, public: false, title: '', reason: `la carpeta es privada o no existe (HTTP ${r.status})`, entries: [] }
  }
  const title = ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/ - Google Drive$/, '').trim()
  const entries: DriveEntry[] = []
  for (const chunk of html.split('flip-entry" id="entry-').slice(1)) {
    const fid = chunk.slice(0, chunk.indexOf('"'))
    const name = ((chunk.match(/flip-entry-title">([^<]*)</) || [])[1] || '').trim()
    const isFolder = /drive\.google\.com\/drive\/folders\//.test(chunk.slice(0, 800))
    entries.push({ id: fid, name, isFolder })
  }
  if (depth < MAX_DEPTH) {
    for (const e of entries.filter((e) => e.isFolder)) e.children = await listFolder(e.id, depth + 1)
  }
  return { id, public: true, title, entries }
}

/** Archivos de imagen de la carpeta y sus subcarpetas (aplanados). */
export function collectFiles(node: DriveFolder, prefix = ''): DriveFile[] {
  const out: DriveFile[] = []
  for (const e of node.entries) {
    if (e.isFolder) {
      if (e.children) out.push(...collectFiles(e.children, `${prefix}${e.name}/`))
    } else if (!SKIP_RE.test(e.name) && e.name !== 'desktop.ini') {
      out.push({ id: e.id, title: e.name, sub: prefix })
    }
  }
  return out
}

// Supabase Storage solo acepta en las claves letras/dígitos ASCII, espacio y
// ! - . * ' ( ) & $ @ = ; : + , _ (se excluyen además / ? # % por las URLs).
const UNSAFE_RE = /[^A-Za-z0-9 !\-.*'()&$@=;:+,_]/g
const UNICODE_SPACE_RE = /[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g
export function sanitizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UNICODE_SPACE_RE, ' ')
    .replace(UNSAFE_RE, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function filenameFromDisposition(cd: string): string | null {
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i)
  if (star) return decodeURIComponent(star[1]).replace(/^"|"$/g, '')
  const plain = cd.match(/filename="?([^";]+)"?/i)
  if (!plain) return null
  // Google manda bytes UTF-8 en el filename plano; Node los lee como latin1
  const utf8 = Buffer.from(plain[1], 'latin1').toString('utf8')
  return utf8.includes('�') ? plain[1] : utf8
}

/** Descarga un archivo público a memoria. Lanza si Drive no lo entrega. */
export async function downloadFile(file: DriveFile): Promise<DownloadedFile> {
  const url = `https://drive.usercontent.google.com/download?id=${file.id}&export=download&confirm=t`
  let lastStatus = 0
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(url, { headers: UA, cache: 'no-store' })
    const contentType = (r.headers.get('content-type') || '').split(';')[0].trim()
    lastStatus = r.status
    if (r.status === 200 && !contentType.startsWith('text/html')) {
      const buffer = Buffer.from(await r.arrayBuffer())
      let name = filenameFromDisposition(r.headers.get('content-disposition') || '') || file.title
      if (!/\.[a-z0-9]{2,5}$/i.test(name) && EXT_BY_TYPE[contentType]) name += EXT_BY_TYPE[contentType]
      return { name: sanitizeName(name), contentType, buffer }
    }
    await new Promise((res) => setTimeout(res, 1000 * attempt))
  }
  throw new Error(`no se pudo descargar de Drive (HTTP ${lastStatus})`)
}
