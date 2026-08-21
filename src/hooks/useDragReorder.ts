'use client'

import { useState } from 'react'
import type { DragEvent } from 'react'

/** Mueve `from` junto a `to`: después si iba antes, antes si iba después. */
export function moveItem(items: string[], from: string, to: string): string[] {
  if (from === to) return items
  const fromIdx = items.indexOf(from)
  const toIdx = items.indexOf(to)
  if (fromIdx < 0 || toIdx < 0) return items
  const without = items.filter((x) => x !== from)
  const insertAt = fromIdx < toIdx ? without.indexOf(to) + 1 : without.indexOf(to)
  without.splice(insertAt, 0, from)
  return without
}

export interface DragReorderProps {
  draggable?: boolean
  onDragStart?: (e: DragEvent<HTMLElement>) => void
  onDragOver?: (e: DragEvent<HTMLElement>) => void
  onDragLeave?: () => void
  onDrop?: (e: DragEvent<HTMLElement>) => void
  onDragEnd?: () => void
}

/**
 * Reordenar con arrastrar y soltar (HTML5, sin librerías). `props(name)` va en
 * cada elemento; `dragging`/`over` sirven para resaltar origen y destino.
 */
export function useDragReorder(items: string[], onReorder: (next: string[]) => void, enabled: boolean) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const props = (name: string): DragReorderProps => {
    if (!enabled) return {}
    return {
      draggable: true,
      onDragStart: (e) => {
        setDragging(name)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', name)
      },
      onDragOver: (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (over !== name) setOver(name)
      },
      onDragLeave: () => {
        if (over === name) setOver(null)
      },
      onDrop: (e) => {
        e.preventDefault()
        const from = dragging ?? e.dataTransfer.getData('text/plain')
        if (from && from !== name) onReorder(moveItem(items, from, name))
        setDragging(null)
        setOver(null)
      },
      onDragEnd: () => {
        setDragging(null)
        setOver(null)
      },
    }
  }

  return { dragging, over, props }
}
