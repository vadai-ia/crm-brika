'use client'

import { useSyncExternalStore } from 'react'
import type { PendingSet, SyncStepResult } from '@/types/inventario'
import { refreshCovers } from '@/hooks/usePropertyCovers'
import { invalidatePropertyImages } from '@/hooks/usePropertyImages'

export interface PhotoSyncState {
  running: boolean
  /** Set que se está importando ahora. */
  current: { setId: number; title: string | null; done: number; total: number } | null
  /** Sets en cola después del actual. */
  queued: number
  /** Propiedades cuyas fotos están en camino (para mostrar "Importando…" en la tarjeta). */
  syncingIds: Set<string>
  /** Mensajes de sets que terminaron con fotos omitidas o sin acceso a Drive. */
  errors: string[]
  /** Sets importados en esta sesión. */
  finished: number
}

// Store en módulo (useSyncExternalStore): el navegador es el "worker" que va
// pidiendo pasos al servidor — cada POST /api/fotos/sync importa una foto —
// hasta que no queden sets pendientes. Idempotente: si dos pestañas lo corren,
// el servidor repite trabajo pero no lo duplica.
let state: PhotoSyncState = { running: false, current: null, queued: 0, syncingIds: new Set(), errors: [], finished: 0 }
const listeners = new Set<() => void>()
let rerun = false

function set(patch: Partial<PhotoSyncState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => state
const SERVER_STATE: PhotoSyncState = { running: false, current: null, queued: 0, syncingIds: new Set(), errors: [], finished: 0 }
const getServerSnapshot = () => SERVER_STATE

async function fetchPending(detect: boolean): Promise<PendingSet[]> {
  const res = await fetch(`/api/fotos/pending${detect ? '?detect=1' : ''}`, { cache: 'no-store' })
  if (!res.ok) return []
  const json = (await res.json()) as { data?: PendingSet[] }
  return json.data ?? []
}

async function step(setId: number): Promise<SyncStepResult | null> {
  const res = await fetch('/api/fotos/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setId }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as { data?: SyncStepResult }
  return json.data ?? null
}

/**
 * Revisión de cambios en Drive para sets ya importados (≤8 por llamada, solo
 * los no revisados en 24 h). Devuelve true si algo quedó pendiente de importar.
 */
async function checkChanges(): Promise<boolean> {
  let changed = 0
  for (let calls = 0; calls < 6; calls++) {
    const res = await fetch('/api/fotos/check', { method: 'POST', cache: 'no-store' })
    if (!res.ok) break
    const json = (await res.json()) as { data?: { checked: number; changed: number; remaining: number } }
    changed += json.data?.changed ?? 0
    if (!json.data || json.data.remaining === 0 || json.data.checked === 0) break
  }
  return changed > 0
}

async function run(detect: boolean) {
  set({ running: true })
  try {
    let checked = false
    do {
      rerun = false
      const pending = await fetchPending(detect)
      set({ syncingIds: new Set(pending.flatMap((p) => p.propertyIds)), queued: pending.length })
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i]
        set({ current: { setId: p.setId, title: p.title, done: p.progress?.done ?? 0, total: p.progress?.total ?? 0 }, queued: pending.length - i - 1 })
        let result: SyncStepResult | null = null
        for (let guard = 0; guard < 500; guard++) {
          result = await step(p.setId)
          if (!result) break // error de red o del servidor: se reintenta en la próxima visita
          set({ current: { setId: p.setId, title: result.title, done: result.progress.done, total: result.progress.total } })
          if (result.done) break
        }
        const ids = result?.propertyIds ?? p.propertyIds
        refreshCovers(ids)
        invalidatePropertyImages(ids)
        const remaining = new Set(state.syncingIds)
        ids.forEach((id) => remaining.delete(id))
        set({
          syncingIds: remaining,
          finished: state.finished + (result?.done ? 1 : 0),
          errors: result?.error ? [...state.errors, `${result.title ?? `Set ${p.setId}`}: ${result.error}`] : state.errors,
        })
        if (!result) break
      }
      // Una vez por arranque: ¿cambió alguna carpeta de Drive ya importada? Si sí, otra vuelta
      if (!checked) {
        checked = true
        if (await checkChanges()) rerun = true
      }
    } while (rerun)
  } catch {
    // silencioso: se vuelve a intentar en la próxima visita o con el cron
  } finally {
    set({ running: false, current: null, queued: 0, syncingIds: new Set() })
  }
}

/** Arranca (o reencola) la importación. `detect` revisa antes el inventario. */
export function startPhotoSync(detect = true) {
  if (typeof window === 'undefined') return
  if (state.running) {
    rerun = true
    return
  }
  void run(detect)
}

export function usePhotoSync(): PhotoSyncState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
