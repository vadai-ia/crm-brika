'use client'

import { useSyncExternalStore } from 'react'
import type { PropertyImage, PropertyImageSet } from '@/types/inventario'
import { refreshCovers } from '@/hooks/usePropertyCovers'

export interface PropertyImagesEntry {
  /** null = aún no cargadas. */
  images: PropertyImage[] | null
  loading: boolean
  error: string | null
  /** Escrituras de visibilidad en curso. */
  pending: number
  saveError: string | null
}

const INITIAL: PropertyImagesEntry = {
  images: null,
  loading: false,
  error: null,
  pending: 0,
  saveError: null,
}

// Store en módulo leído con useSyncExternalStore: las fotos de cada propiedad
// (con su visibilidad en la web) se cargan una vez por pestaña y todas las
// tarjetas que las usan se enteran de los cambios. La visibilidad vive en la
// tabla propiedad_imagenes_visibilidad: el toggle es optimista y se revierte
// (solo las fotos afectadas) si el servidor falla.
const store = new Map<string, PropertyImagesEntry>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getServerSnapshot(): PropertyImagesEntry {
  return INITIAL
}

function update(propertyId: string, patch: Partial<PropertyImagesEntry>) {
  store.set(propertyId, { ...(store.get(propertyId) ?? INITIAL), ...patch })
  listeners.forEach((l) => l())
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  return body.error ?? fallback
}

/** Olvida las fotos cargadas de esas propiedades (tras importar fotos nuevas): la galería abierta recarga sola. */
export function invalidatePropertyImages(propertyIds: string[]) {
  let changed = false
  for (const id of propertyIds) {
    if (store.delete(id)) changed = true
  }
  if (changed) listeners.forEach((l) => l())
}

/** Carga (una vez por pestaña) las fotos de la propiedad; `force` recarga. */
export function loadPropertyImages(propertyId: string, force = false) {
  const current = store.get(propertyId) ?? INITIAL
  if (!force && (current.loading || current.images !== null)) return

  update(propertyId, { loading: true, error: null })
  fetch(`/api/properties/${propertyId}/images`)
    .then(async (res) => {
      if (!res.ok) throw new Error(await errorMessage(res, 'Error al cargar las fotos'))
      const { data } = (await res.json()) as { data: PropertyImageSet }
      update(propertyId, { images: data.images, loading: false })
    })
    .catch((err: unknown) => {
      update(propertyId, {
        loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar las fotos',
      })
    })
}

/** Muestra u oculta fotos en la página web (PATCH optimista). */
export async function setImagesVisibility(
  propertyId: string,
  names: string[],
  visible: boolean
): Promise<void> {
  const current = store.get(propertyId)
  if (!current?.images) return

  const targets = new Set(names)
  const before = new Map(current.images.map((img) => [img.name, img.visible]))
  update(propertyId, {
    images: current.images.map((img) => (targets.has(img.name) ? { ...img, visible } : img)),
    pending: current.pending + 1,
    saveError: null,
  })

  try {
    const res = await fetch(`/api/properties/${propertyId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names, visible }),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo guardar'))
    // La portada de la tarjeta es la primera foto visible: refrescarla
    refreshCovers([propertyId])
  } catch (err: unknown) {
    const latest = store.get(propertyId)
    update(propertyId, {
      images: (latest?.images ?? []).map((img) =>
        targets.has(img.name) ? { ...img, visible: before.get(img.name) ?? img.visible } : img
      ),
      saveError: err instanceof Error ? err.message : 'No se pudo guardar',
    })
  } finally {
    const latest = store.get(propertyId) ?? INITIAL
    update(propertyId, { pending: Math.max(0, latest.pending - 1) })
  }
}

/** Guarda el orden de las fotos (PATCH optimista). La #1 visible es la portada. */
export async function reorderImages(propertyId: string, names: string[]): Promise<void> {
  const current = store.get(propertyId)
  if (!current?.images) return
  const previous = current.images
  const byName = new Map(previous.map((img) => [img.name, img]))
  const ordered = [
    ...names.map((n) => byName.get(n)).filter((img): img is PropertyImage => img !== undefined),
    ...previous.filter((img) => !names.includes(img.name)),
  ]
  update(propertyId, { images: ordered, pending: current.pending + 1, saveError: null })

  try {
    const res = await fetch(`/api/properties/${propertyId}/images`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: ordered.map((img) => img.name) }),
    })
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo guardar el orden'))
    refreshCovers([propertyId]) // la portada es la #1 visible
  } catch (err: unknown) {
    update(propertyId, { images: previous, saveError: err instanceof Error ? err.message : 'No se pudo guardar el orden' })
  } finally {
    const latest = store.get(propertyId) ?? INITIAL
    update(propertyId, { pending: Math.max(0, latest.pending - 1) })
  }
}

/** Pone la foto en primer lugar (portada del CRM y de la web). */
export function setCoverImage(propertyId: string, name: string): Promise<void> {
  const images = store.get(propertyId)?.images ?? []
  return reorderImages(propertyId, [name, ...images.map((img) => img.name).filter((n) => n !== name)])
}

/** Fotos + visibilidad de una propiedad (reactivo a cargas y toggles). */
export function usePropertyImages(propertyId: string): PropertyImagesEntry {
  return useSyncExternalStore(
    subscribe,
    () => store.get(propertyId) ?? INITIAL,
    getServerSnapshot
  )
}
