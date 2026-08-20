'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
}

const BORDER_COLORS = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
}

const TEXT_COLORS = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
}

export function Toast({ message, type, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const Icon = ICONS[type]

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 200)
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 brika-modal-solid
        transition-all duration-200 max-w-sm
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{
        borderRadius: '12px',
        borderLeft: `3px solid ${BORDER_COLORS[type]}`,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Icon
        className="w-5 h-5 flex-shrink-0"
        strokeWidth={1.5}
        style={{ color: TEXT_COLORS[type] }}
      />
      <p className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
        {message}
      </p>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 200) }}
        className="flex-shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4 opacity-60 hover:opacity-100 transition-opacity" strokeWidth={1.5} />
      </button>
    </div>
  )
}
