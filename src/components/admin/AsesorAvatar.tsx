'use client'

import { useState } from 'react'

interface AsesorAvatarProps {
  name: string
  url: string | null
  size?: number
}

/** Avatar circular: imagen de `avatar_url` o inicial del nombre sobre el morado de marca. */
export function AsesorAvatar({ name, url, size = 36 }: AsesorAvatarProps) {
  const [broken, setBroken] = useState(false)
  const initial = (name?.trim().charAt(0) || '?').toUpperCase()

  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        onError={() => setBroken(true)}
        className="rounded-full object-cover flex-shrink-0 bg-bg-tertiary"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      aria-hidden
      className="rounded-full flex items-center justify-center flex-shrink-0 bg-orange text-white font-semibold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initial}
    </div>
  )
}
