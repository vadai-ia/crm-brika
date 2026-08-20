// Celdas reutilizables para las tablas de leads de formularios web.

import { displayValue, formatDateTime } from '@/lib/utils/format'

export function DateCell({ value }: { value: string | null }) {
  return <span className="whitespace-nowrap text-text-secondary">{formatDateTime(value)}</span>
}

export function EmailCell({ value }: { value: string | null }) {
  if (!value) return <>—</>
  return (
    <a href={`mailto:${value}`} className="text-orange hover:underline">
      {value}
    </a>
  )
}

export function PhoneCell({ value }: { value: string | null }) {
  if (!value) return <>—</>
  return (
    <a href={`tel:${value}`} className="text-orange hover:underline whitespace-nowrap">
      {value}
    </a>
  )
}

export function MessageCell({ value }: { value: string | null }) {
  if (!value) return <>—</>
  return (
    <span className="block max-w-[320px] truncate" title={value}>
      {value}
    </span>
  )
}

export function TextCell({ value }: { value: string | number | null }) {
  return <>{displayValue(value)}</>
}
