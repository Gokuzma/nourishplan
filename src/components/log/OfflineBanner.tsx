import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="bg-accent/20 text-text border-b border-accent/40 text-sm px-4 py-2 text-center w-full">
      You are offline. Some features are unavailable.
    </div>
  )
}
