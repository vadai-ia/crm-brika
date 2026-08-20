'use client'

import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { CategoryManager } from './CategoryManager'

interface Category {
  id: string
  name: string
  color: string
}

interface CategoryFilterProps {
  hiddenCategories: Set<string>
  onToggle: (categoryId: string) => void
  onManagerChanged: () => void
}

export function CategoryFilter({ hiddenCategories, onToggle, onManagerChanged }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [showManager, setShowManager] = useState(false)

  const fetchCategories = () => {
    fetch('/api/calendar/categories')
      .then((r) => r.json())
      .then((data) => setCategories(data.data ?? []))
      .catch(() => {})
  }

  useEffect(() => { fetchCategories() }, [])

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onToggle('__none__')}
          className={`h-7 px-2.5 text-[11px] font-medium rounded-full border transition-colors cursor-pointer flex items-center gap-1.5
            ${!hiddenCategories.has('__none__') ? 'border-[#A31CDC]/30 bg-[#A31CDC]/10 text-[#A31CDC]' : 'border-border-primary text-text-tertiary'}`}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#A31CDC' }} />
          Sin categoria
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className={`h-7 px-2.5 text-[11px] font-medium rounded-full border transition-colors cursor-pointer flex items-center gap-1.5
              ${!hiddenCategories.has(cat.id) ? 'bg-opacity-10 border-opacity-30' : 'border-border-primary text-text-tertiary'}`}
            style={!hiddenCategories.has(cat.id) ? { borderColor: `${cat.color}50`, backgroundColor: `${cat.color}18`, color: cat.color } : undefined}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
          </button>
        ))}

        <button
          onClick={() => setShowManager(true)}
          className="h-7 px-2 text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
          title="Gestionar categorias"
        >
          <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {showManager && (
        <CategoryManager
          onClose={() => setShowManager(false)}
          onChanged={() => { fetchCategories(); onManagerChanged() }}
        />
      )}
    </>
  )
}
