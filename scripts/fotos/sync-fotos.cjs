#!/usr/bin/env node
// Sincroniza las fotos del inventario: carpeta de Drive (pública) → set del bucket Imagenes,
// en tamaño web (máx. 1600 px) más miniatura (640 px) en _thumbs/<set>/. Sin transformaciones
// de Supabase (se cobran por imagen): el CRM y la web sirven estos archivos directo.
//
//   node scripts/fotos/sync-fotos.cjs                    dry-run: muestra qué cambiaría (no toca nada)
//   node scripts/fotos/sync-fotos.cjs --apply            aplica (respalda en _backup/<fecha>/ antes de tocar un set)
//   node scripts/fotos/sync-fotos.cjs --only 5,14        solo esos sets ("nuevo" = solo carpetas sin set)
//   node scripts/fotos/sync-fotos.cjs --reoptimize       vuelve a generar todas las fotos (no solo las nuevas)
//   node scripts/fotos/sync-fotos.cjs --delete-backups   borra todos los respaldos de _backup/
//
// Estado: tabla image_sets (una fila por carpeta de Drive = set) y manifiesto
// _manifest/<set>.json en el bucket (qué archivo de Drive es cada foto). Reglas en README.md.
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { createClient } = require('@supabase/supabase-js')
const { folderIdFromUrl, listFolder, collectFiles, downloadFile, sanitizeName } = require('./drive.cjs')

const ROOT = path.resolve(__dirname, '..', '..')
const CACHE = path.join(__dirname, '.cache')
const BUCKET = 'Imagenes'
const THUMBS = '_thumbs'
const MANIFESTS = '_manifest'
const SETS_TABLE = 'propiedad_image_sets'
const IMAGE_SETS = 'image_sets'
const INVENTARIO = 'inventario_industrial'
const URL_RE = /https?:\/\/[^\s,;"']+/g
// Un original se conserva tal cual (sin recodificar) si ya es web: jpg/webp, ≤1600 px y ≤400 KB
const KEEP_RE = /\.(jpe?g|webp)$/i
const KEEP_MAX_SIDE = 1600
const KEEP_MAX_BYTES = 400 * 1024
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const REOPTIMIZE = args.includes('--reoptimize')
const DELETE_BACKUPS = args.includes('--delete-backups')
const onlyIdx = args.indexOf('--only')
const ONLY = onlyIdx >= 0 ? new Set(String(args[onlyIdx + 1]).split(',').map((s) => (s === 'nuevo' ? 'nuevo' : Number(s)))) : null

function loadEnv() {
  const file = path.join(ROOT, '.env.local')
  if (!fs.existsSync(file)) throw new Error('Falta .env.local en la raíz del proyecto')
  const env = {}
  for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!l || l.startsWith('#') || !l.includes('=')) continue
    const i = l.indexOf('=')
    env[l.slice(0, i).trim()] = l.slice(i + 1).trim()
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('.env.local sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }
  return env
}
const env = loadEnv()
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const storage = () => sb.storage.from(BUCKET)
const isFolder = (item) => item.id === null || item.metadata === null
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''))

async function listFiles(prefix) {
  const { data, error } = await storage().list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${prefix || '/'}: ${error.message}`)
  return (data ?? []).filter((i) => !isFolder(i)).map((i) => ({ name: i.name, size: i.metadata.size }))
}

async function listRecursive(prefix) {
  const { data, error } = await storage().list(prefix, { limit: 1000 })
  if (error) throw new Error(`list ${prefix}: ${error.message}`)
  const out = []
  for (const item of data ?? []) {
    const p = `${prefix}/${item.name}`
    if (isFolder(item)) out.push(...(await listRecursive(p)))
    else out.push(p)
  }
  return out
}

async function removePaths(paths) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await storage().remove(paths.slice(i, i + 100))
    if (error) throw new Error(`remove: ${error.message}`)
  }
}

async function deleteBackups() {
  const files = await listRecursive('_backup')
  if (files.length === 0) return console.log('No hay respaldos en _backup/.')
  await removePaths(files)
  console.log(`Borrados ${files.length} archivos de _backup/.`)
}

async function fetchAll(table, columns) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  return rows
}

async function readManifest(setId) {
  const { data, error } = await storage().download(`${MANIFESTS}/${setId}.json`)
  if (error || !data) return { files: {} }
  try { return JSON.parse(await data.text()) } catch { return { files: {} } }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]) }
  }))
  return out
}

/** Genera <id>.web.jpg / <id>.thumb.jpg / <id>.opt.json para lo que falte en cacheDir. */
function optimize(cacheDir, metas) {
  if (metas.some((m) => !fs.existsSync(path.join(cacheDir, `${m.id}.opt.json`)))) {
    const ps1 = path.join(__dirname, 'optimize-images.ps1')
    const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Root', cacheDir], { encoding: 'utf8' })
    if (r.error) console.log(`  (no se pudo ejecutar PowerShell: ${r.error.message})`)
  }
  return metas.map((m) => {
    const optPath = path.join(cacheDir, `${m.id}.opt.json`)
    if (!fs.existsSync(optPath)) return { ...m, error: 'sin optimizar' }
    const opt = readJson(optPath)
    if (opt.error) return { ...m, error: `no se pudo procesar: ${opt.error}` }
    const keep = KEEP_RE.test(m.name) && Math.max(opt.width, opt.height) <= KEEP_MAX_SIDE && m.size <= KEEP_MAX_BYTES
    const ext = keep ? path.extname(m.name).toLowerCase() : '.jpg'
    return {
      ...m,
      width: opt.width,
      height: opt.height,
      webLocal: keep ? m.localName : `${m.id}.web.jpg`,
      webSize: keep ? m.size : opt.webBytes,
      webType: MIME[ext] || 'image/jpeg',
      thumbLocal: `${m.id}.thumb.jpg`,
      thumbSize: opt.thumbBytes,
      baseName: sanitizeName(m.name.replace(/\.[a-z0-9]{2,5}$/i, '')) + ext,
    }
  })
}

/** Nombres finales únicos dentro del set (respetando los ya asignados en el manifiesto). */
function assignNames(metas, taken) {
  const seen = new Set(taken)
  const counts = new Map()
  for (const m of metas) counts.set(m.baseName, (counts.get(m.baseName) ?? 0) + 1)
  for (const m of metas) {
    let final = m.baseName
    if (counts.get(m.baseName) > 1 && m.sub) final = sanitizeName(`${m.sub.replace(/\/$/, '').replace(/\//g, ' - ')} - ${m.baseName}`)
    for (let n = 2; seen.has(final); n++) final = m.baseName.replace(/(\.[a-z0-9]+)$/i, ` (${n})$1`)
    seen.add(final)
    m.final = final
  }
}

async function main() {
  if (DELETE_BACKUPS) return deleteBackups()

  const props = await fetchAll(INVENTARIO, 'id, parque, unidad, links_imagenes_carpetas_drive')
  const mappings = await fetchAll(SETS_TABLE, 'propiedad_id, image_set_id')
  const imageSets = await fetchAll(IMAGE_SETS, 'id, drive_folder_id, status')
  const setOf = new Map(mappings.map((s) => [s.propiedad_id, Number(s.image_set_id)]))
  const setByFolder = new Map(imageSets.map((s) => [s.drive_folder_id, Number(s.id)]))

  // Carpetas de Drive ← propiedades que las referencian
  const folders = new Map()
  let sinLink = 0
  for (const p of props) {
    const links = String(p.links_imagenes_carpetas_drive ?? '').match(URL_RE) ?? []
    const fid = links.length ? folderIdFromUrl(links[0]) : null
    if (!fid) { sinLink++; continue }
    if (!folders.has(fid)) folders.set(fid, { fid, props: [], parques: new Map() })
    const f = folders.get(fid)
    f.props.push(p)
    f.parques.set(p.parque, (f.parques.get(p.parque) ?? 0) + 1)
  }

  // Siguiente número de set libre (tabla image_sets, mapeos y carpetas numéricas del bucket)
  const { data: rootItems } = await storage().list('', { limit: 1000 })
  const rootNums = (rootItems ?? []).filter(isFolder).map((i) => Number(i.name)).filter(Number.isInteger)
  let nextSet = Math.max(0, ...imageSets.map((s) => Number(s.id)), ...mappings.map((s) => Number(s.image_set_id)), ...rootNums) + 1

  const ordered = [...folders.values()].sort((a, b) => (setByFolder.get(a.fid) ?? 1e9) - (setByFolder.get(b.fid) ?? 1e9))
  const plan = []
  for (const f of ordered) {
    const parques = [...f.parques].map(([k, n]) => `${k} ×${n}`).join(', ')
    const existing = setByFolder.get(f.fid) ?? null
    const isNew = existing === null
    if (ONLY && !(ONLY.has(existing) || (isNew && ONLY.has('nuevo')))) continue
    const setId = existing ?? nextSet++
    const label = `Set ${String(setId).padStart(2)}${isNew ? ' (nuevo)' : ''}`

    const node = await listFolder(f.fid)
    if (!node.public) { console.log(`✗ ${label} ${f.fid}: carpeta PRIVADA (${node.reason}) ← ${parques}`); continue }
    const driveFiles = collectFiles(node)
    const manifest = isNew ? { files: {} } : await readManifest(setId)
    const known = manifest.files ?? {}
    const keptEntries = REOPTIMIZE ? [] : driveFiles.filter((d) => known[d.id]).map((d) => ({ driveId: d.id, ...known[d.id] }))
    const pendingFiles = driveFiles.filter((d) => REOPTIMIZE || !known[d.id])

    const cacheDir = path.join(CACHE, f.fid)
    const downloaded = await mapLimit(pendingFiles, 3, (file) => downloadFile(file, cacheDir))
    const metas = optimize(cacheDir, downloaded.filter((m) => !m.error))
    const failed = [...downloaded.filter((m) => m.error), ...metas.filter((m) => m.error)]
    const ok = metas.filter((m) => !m.error)
    assignNames(ok, keptEntries.map((e) => e.name))

    const finalNames = new Set([...keptEntries.map((e) => e.name), ...ok.map((m) => m.final)])
    const bucketWeb = isNew ? [] : await listFiles(String(setId))
    const bucketThumbs = isNew ? [] : await listFiles(`${THUMBS}/${setId}`)
    const removeWeb = bucketWeb.map((b) => b.name).filter((n) => !finalNames.has(n))
    const removeThumbs = bucketThumbs.map((b) => b.name).filter((n) => !finalNames.has(n))
    const missingThumbs = keptEntries.filter((e) => !bucketThumbs.some((b) => b.name === e.name)).map((e) => e.name)
    const unmapped = f.props.filter((p) => !setOf.has(p.id))
    const replaced = ok.filter((m) => bucketWeb.some((b) => b.name === m.final)).length
    const hasChanges = ok.length + removeWeb.length + removeThumbs.length + unmapped.length > 0
    const entry = { f, setId, isNew, title: node.title, ok, keptEntries, failed, removeWeb, removeThumbs, missingThumbs, unmapped, cacheDir, replaced, hasChanges }
    plan.push(entry)

    const webTotal = ok.reduce((n, m) => n + m.webSize, 0)
    const summary = hasChanges
      ? `${ok.length} fotos a subir (${replaced} reemplazan, ${Math.round(webTotal / 1024)} KB en total), −${removeWeb.length} sobran${unmapped.length ? `, ${unmapped.length} propiedades por mapear` : ''}`
      : `✓ al día (${keptEntries.length} fotos)`
    console.log(`${hasChanges ? '•' : '✓'} ${label} "${node.title}" ← ${parques}: ${summary}${failed.length ? ` | ${failed.length} con error` : ''}${missingThumbs.length ? ` | ${missingThumbs.length} sin miniatura` : ''}`)
    if (hasChanges) {
      for (const m of ok) console.log(`      ${bucketWeb.some((b) => b.name === m.final) ? '~' : '+'} ${m.final}  ${m.width}x${m.height}, ${Math.round(m.size / 1024)} KB → ${Math.round(m.webSize / 1024)} KB${m.webLocal === m.localName ? ' (original)' : ''}`)
      for (const n of removeWeb) console.log(`      − ${n}`)
    }
    for (const x of failed) console.log(`      ⚠ ${x.sub ?? ''}${x.title ?? x.name}: ${x.error}`)
  }

  const pending = plan.filter((p) => p.hasChanges)
  console.log(`\n${plan.length} carpetas revisadas, ${pending.length} con cambios; ${sinLink} propiedades sin link de Drive.`)
  if (!APPLY) { if (pending.length) console.log('Dry-run: no se tocó nada. Corre con --apply para aplicar.'); return }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  for (const p of pending) {
    const { setId, ok, keptEntries, removeWeb, removeThumbs, cacheDir } = p
    const needsBackup = !p.isNew && (p.replaced > 0 || removeWeb.length > 0)
    if (needsBackup) {
      for (const b of await listFiles(String(setId))) {
        const { error } = await storage().copy(`${setId}/${b.name}`, `_backup/${ts}/${setId}/${b.name}`)
        if (error) throw new Error(`backup ${setId}/${b.name}: ${error.message}`)
      }
    }
    for (const m of ok) {
      const web = fs.readFileSync(path.join(cacheDir, m.webLocal))
      let r = await storage().upload(`${setId}/${m.final}`, web, { contentType: m.webType, upsert: true })
      if (r.error) throw new Error(`upload ${setId}/${m.final}: ${r.error.message}`)
      const thumb = fs.readFileSync(path.join(cacheDir, m.thumbLocal))
      r = await storage().upload(`${THUMBS}/${setId}/${m.final}`, thumb, { contentType: 'image/jpeg', upsert: true })
      if (r.error) throw new Error(`upload thumb ${setId}/${m.final}: ${r.error.message}`)
    }
    await removePaths([...removeWeb.map((n) => `${setId}/${n}`), ...removeThumbs.map((n) => `${THUMBS}/${setId}/${n}`)])

    const files = {}
    for (const e of keptEntries) files[e.driveId] = { name: e.name, sourceName: e.sourceName, sourceSize: e.sourceSize, width: e.width, height: e.height }
    for (const m of ok) files[m.id] = { name: m.final, sourceName: `${m.sub}${m.title}`, sourceSize: m.size, width: m.width, height: m.height }
    const manifest = { setId, driveFolderId: p.f.fid, driveTitle: p.title, syncedAt: new Date().toISOString(), files }
    const mr = await storage().upload(`${MANIFESTS}/${setId}.json`, Buffer.from(JSON.stringify(manifest, null, 1)), { contentType: 'application/json', upsert: true })
    if (mr.error) throw new Error(`manifest ${setId}: ${mr.error.message}`)

    const row = {
      id: setId,
      drive_folder_id: p.f.fid,
      drive_title: p.title,
      status: p.failed.length ? 'error' : 'ok',
      progress: { total: Object.keys(files).length, done: Object.keys(files).length, skipped: p.failed.map((x) => `${x.sub ?? ''}${x.title ?? x.name}: ${x.error}`) },
      last_synced_at: new Date().toISOString(),
      last_error: p.failed.length ? `${p.failed.length} fotos no se pudieron procesar` : null,
      updated_at: new Date().toISOString(),
    }
    const ur = await sb.from(IMAGE_SETS).upsert(row, { onConflict: 'id' })
    if (ur.error) throw new Error(`image_sets ${setId}: ${ur.error.message}`)
    if (p.unmapped.length) {
      const { error } = await sb.from(SETS_TABLE).upsert(p.unmapped.map((x) => ({ propiedad_id: x.id, image_set_id: setId })), { onConflict: 'propiedad_id' })
      if (error) throw new Error(`mapeo set ${setId}: ${error.message}`)
    }
    console.log(`Set ${setId}${p.isNew ? ' (nuevo)' : ''}: ${ok.length} subidas, ${removeWeb.length} borradas, ${p.unmapped.length} propiedades mapeadas${needsBackup ? `, respaldo en _backup/${ts}/${setId}/` : ''}`)
  }
  console.log('\nListo. Cuando confirmes que todo se ve bien: --delete-backups.')
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1) })
