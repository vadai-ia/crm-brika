'use client'

import { useCallback, useEffect, useState } from 'react'
import { LayoutGrid, LayoutList } from 'lucide-react'

type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'brika-view-mode'

export function ViewToggle({
  onChange,
}: {
  onChange: (mode: ViewMode) => void
}) {
  const [mode, setMode] = useState<ViewMode>('grid')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'grid' || stored === 'list') {
      setMode(stored)
      onChange(stored)
    }
  }, [onChange])

  const toggle = useCallback(
    (newMode: ViewMode) => {
      setMode(newMode)
      localStorage.setItem(STORAGE_KEY, newMode)
      onChange(newMode)
    },
    [onChange]
  )

  return (
    <div className="flex items-center bg-bg-tertiary rounded-[var(--radius-sm)] p-0.5">
      <button
        onClick={() => toggle('grid')}
        className={`flex items-center justify-center w-8 h-8 rounded-[6px] transition-colors cursor-pointer ${
          mode === 'grid'
            ? 'bg-bg-secondary text-text-primary shadow-sm'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
        aria-label="Vista tarjetas"
      >
        <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={() => toggle('list')}
        className={`flex items-center justify-center w-8 h-8 rounded-[6px] transition-colors cursor-pointer ${
          mode === 'list'
            ? 'bg-bg-secondary text-text-primary shadow-sm'
            : 'text-text-tertiary hover:text-text-secondary'
        }`}
        aria-label="Vista lista"
      >
        <LayoutList className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  )
}
