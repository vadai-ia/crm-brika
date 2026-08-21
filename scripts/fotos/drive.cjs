// Acceso a carpetas de Google Drive compartidas como "Cualquier persona con el
// enlace → Lector", sin OAuth: listado vía la vista embebida y descarga vía
// drive.usercontent.google.com. No sirve con carpetas privadas (401).
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const SKIP_RE = /\.(ai|psd|pdf|docx?|xlsx?|txt|zip|rar|mp4|mov)$/i
const EXT_BY_TYPE = {
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

function folderIdFromUrl(url) {
  return (String(url).match(/\/folders\/([A-Za-z0-9_-]+)/) || [])[1] ?? null
}

/** Lista una carpeta pública (recursivo hasta 3 niveles). */
async function listFolder(id, depth = 0) {
  const r = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, { redirect: 'manual', headers: UA })
  if (r.status >= 300 && r.status < 400) {
    return { id, public: false, reason: `HTTP ${r.status}, redirige a inicio de sesión`, entries: [] }
  }
  const html = await r.text()
  if (r.status !== 200 || /accounts\.google\.com|ServiceLogin|You need access/i.test(html)) {
    return { id, public: false, reason: `HTTP ${r.status}, pide acceso`, entries: [] }
  }
  const title = ((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/ - Google Drive$/, '').trim()
  const entries = []
  for (const chunk of html.split('flip-entry" id="entry-').slice(1)) {
    const fid = chunk.slice(0, chunk.indexOf('"'))
    const name = ((chunk.match(/flip-entry-title">([^<]*)</) || [])[1] || '').trim()
    const isFolder = /drive\.google\.com\/drive\/folders\//.test(chunk.slice(0, 800))
    entries.push({ id: fid, name, isFolder })
  }
  const node = { id, public: true, title, entries }
  if (depth < 3) {
    for (const e of entries.filter((e) => e.isFolder)) e.children = await listFolder(e.id, depth + 1)
  }
  return node
}

/** Archivos de imagen de la carpeta y sus subcarpetas (aplanados, con prefijo de subcarpeta). */
function collectFiles(node, prefix = '') {
  const out = []
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
// Acentos → letra base; espacios unicode (p. ej. el U+202F de las capturas de
// macOS) → espacio normal; cualquier otro carácter → guion.
const UNSAFE_RE = /[^A-Za-z0-9 !\-.*'()&$@=;:+,_]/g
const UNICODE_SPACE_RE = /[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g
function sanitizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UNICODE_SPACE_RE, ' ')
    .replace(UNSAFE_RE, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function filenameFromDisposition(cd) {
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i)
  if (star) return decodeURIComponent(star[1]).replace(/^"|"$/g, '')
  const plain = cd.match(/filename="?([^";]+)"?/i)
  if (!plain) return null
  // Google manda bytes UTF-8 en el filename plano; Node los lee como latin1
  const utf8 = Buffer.from(plain[1], 'latin1').toString('utf8')
  return utf8.includes('�') ? plain[1] : utf8
}

/**
 * Descarga un archivo público a cacheDir (una sola vez: se cachea por id).
 * Devuelve { id, title, sub, name, contentType, size, md5, localName } o { error }.
 */
async function downloadFile(file, cacheDir) {
  fs.mkdirSync(cacheDir, { recursive: true })
  const metaPath = path.join(cacheDir, `${file.id}.json`)
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    if (fs.existsSync(path.join(cacheDir, meta.localName))) return meta
  }
  const url = `https://drive.usercontent.google.com/download?id=${file.id}&export=download&confirm=t`
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(url, { headers: UA })
    const ct = (r.headers.get('content-type') || '').split(';')[0].trim()
    if (r.status === 200 && !ct.startsWith('text/html')) {
      const buf = Buffer.from(await r.arrayBuffer())
      let name = filenameFromDisposition(r.headers.get('content-disposition') || '') || file.title
      if (!/\.[a-z0-9]{2,5}$/i.test(name) && EXT_BY_TYPE[ct]) name += EXT_BY_TYPE[ct]
      const localName = `${file.id}${path.extname(name)}`
      fs.writeFileSync(path.join(cacheDir, localName), buf)
      const meta = {
        id: file.id,
        title: file.title,
        sub: file.sub,
        name: sanitizeName(name),
        contentType: ct,
        size: buf.length,
        md5: crypto.createHash('md5').update(buf).digest('hex'),
        localName,
      }
      fs.writeFileSync(metaPath, JSON.stringify(meta))
      return meta
    }
    await new Promise((res) => setTimeout(res, 1500 * attempt))
  }
  return { id: file.id, title: file.title, sub: file.sub, error: 'no se pudo descargar (¿privado o demasiado grande?)' }
}

module.exports = { folderIdFromUrl, listFolder, collectFiles, downloadFile, sanitizeName }
