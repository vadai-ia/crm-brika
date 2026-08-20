'use client'

import { useEffect, useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'

type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'brika-desarrollos-view-mode'

export function ViewToggle({ onChange }: { onChange: (mode: ViewMode) => void }) {
  const [mode, setMode] = useState<ViewMode>('grid')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ViewMode | null
    if (saved === 'grid' || saved === 'list') {
      setMode(saved)
      onChange(saved)
    }
  }, [onChange])

  const toggle = (newMode: ViewMode) => {
    setMode(newMode)
    localStorage.setItem(STORAGE_KEY, newMode)
    onChange(newMode)
  }

  return (
    <div className="flex items-center border border-border-primary rounded-[var(--radius-sm)] overflow-hidden">
      <button
        onClick={() => toggle('grid')}
        className={`p-2 transition-colors cursor-pointer ${mode === 'grid' ? 'bg-bg-tertiary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
      >
        <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        onClick={() => toggle('list')}
        className={`p-2 transition-colors cursor-pointer ${mode === 'list' ? 'bg-bg-tertiary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
      >
        <List className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  )
}
