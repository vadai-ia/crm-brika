'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Property } from '@/types'

const MAX_IDS = 50

/**
 * Enlace directo a la ficha: /dashboard/pdf?id=<uuid> (o ?ids=a,b,c). Carga
 * esas propiedades completas, las entrega a `apply` y limpia la URL para que
 * un refresh no las vuelva a aplicar.
 */
export function usePdfDeepLink(
  apply: (properties: Property[]) => void,
  onError?: (message: string) => void
) {
  const params = useSearchParams()
  const router = useRouter()
  const raw = params.get('id') ?? params.get('ids')

  useEffect(() => {
    if (!raw) return
    const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, MAX_IDS)
    let cancelled = false

    Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`/api/properties/${id}`)
        if (!res.ok) return null
        const json = (await res.json()) as { data?: Property }
        return json.data ?? null
      })
    ).then((list) => {
      if (cancelled) return
      const found = list.filter((p): p is Property => p !== null)
      if (found.length > 0) apply(found)
      if (found.length < ids.length) onError?.('Alguna propiedad del enlace no se encontró')
      router.replace('/dashboard/pdf')
    })

    return () => {
      cancelled = true
    }
  }, [raw, apply, onError, router])
}
