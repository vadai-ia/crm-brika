'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="brika-icon-btn"
      style={{ width: '36px', height: '36px' }}
    >
      <div
        style={{
          transform: isDark ? 'rotate(0deg)' : 'rotate(180deg)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDark ? (
          <Sun style={{ width: '20px', height: '20px', color: 'var(--text-secondary)' }} strokeWidth={1.5} />
        ) : (
          <Moon style={{ width: '20px', height: '20px', color: 'var(--text-secondary)' }} strokeWidth={1.5} />
        )}
      </div>
    </button>
  )
}
