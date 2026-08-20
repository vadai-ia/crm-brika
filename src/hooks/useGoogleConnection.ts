'use client'

import { useCallback, useEffect, useState } from 'react'

interface ConnectionState {
  isConnected: boolean
  calendarEmail: string | null
  selectedCalendarName: string | null
  loading: boolean
}

export function useGoogleConnection() {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    calendarEmail: null,
    selectedCalendarName: null,
    loading: true,
  })

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/list')
      if (res.ok) {
        setState((prev) => ({ ...prev, isConnected: true, loading: false }))
      } else {
        setState({ isConnected: false, calendarEmail: null, selectedCalendarName: null, loading: false })
      }
    } catch {
      setState({ isConnected: false, calendarEmail: null, selectedCalendarName: null, loading: false })
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { ...state, refetch }
}
