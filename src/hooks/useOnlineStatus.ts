import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PING_INTERVAL_MS = 30_000

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }

    async function checkConnectivity() {
      try {
        const { error } = await supabase.auth.getSession()
        setIsOnline(!error)
      } catch {
        setIsOnline(false)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verify actual connectivity on mount
    checkConnectivity()

    // Re-check periodically
    intervalRef.current = setInterval(checkConnectivity, PING_INTERVAL_MS)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return isOnline
}
