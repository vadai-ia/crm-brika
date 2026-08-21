'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Property } from '@/types'
import type { PropertyCover } from '@/types/inventario'

const BATCH = 50

/** `undefined` = cargando, `null` = la propiedad no tiene fotos. */
export type CoverMap = Record<string, PropertyCover | null | undefined>

// Cache por pestaña: la portada no cambia entre páginas ni al alternar
// lista/tarjetas, así que cada id se pide al servidor una sola vez. Se lee
// con useSyncExternalStore (sin setState en efectos); `version` sube con
// cada lote resuelto para que los consumidores recalculen su mapa.
const cache = new Map<string, PropertyCover | null>()
const inFlight = new Set<string>()
const listeners = new Set<() => void>()
let version = 0

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getVersion() {
  return version
}

function notify() {
  version += 1
  listeners.forEach((l) => l())
}

async function fetchBatch(ids: string[]) {
  ids.forEach((id) => inFlight.add(id))
  try {
    const res = await fetch('/api/properties/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) return // no se cachea: se reintenta en el siguiente cambio de lista
    const json = (await res.json()) as { covers?: Record<string, PropertyCover> }
    const found = json.covers ?? {}
    for (const id of ids) cache.set(id, found[id] ?? null)
  } catch {
    // idem: sin cache, se reintenta después
  } finally {
    ids.forEach((id) => inFlight.delete(id))
    notify()
  }
}

function ensureFetched(ids: string[]) {
  const missing = ids.filter((id) => !cache.has(id) && !inFlight.has(id))
  for (let i = 0; i < missing.length; i += BATCH) {
    void fetchBatch(missing.slice(i, i + BATCH))
  }
}

/**
 * Vuelve a pedir la portada (p. ej. tras ocultar/mostrar fotos: la portada es
 * la primera visible). Conserva la anterior mientras llega la nueva.
 */
export function refreshCovers(ids: string[]) {
  const pending = ids.filter((id) => !inFlight.has(id))
  if (pending.length > 0) void fetchBatch(pending)
}

/**
 * Portada por propiedad para las tarjetas de /dashboard/propiedades.
 * Pide solo los ids que aún no están en cache, en lotes de 50 (regla #2).
 */
export function usePropertyCovers(properties: Property[]): CoverMap {
  const cacheVersion = useSyncExternalStore(subscribe, getVersion, getVersion)
  const ids = useMemo(() => properties.map((p) => String(p.id)), [properties])

  useEffect(() => {
    ensureFetched(ids)
  }, [ids])

  return useMemo(
    () => {
      void cacheVersion // dependencia explícita: el mapa se rearma al resolverse cada lote
      return Object.fromEntries(ids.map((id) => [id, cache.get(id)]))
    },
    [ids, cacheVersion]
  )
}
