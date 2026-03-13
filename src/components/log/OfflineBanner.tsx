import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="bg-amber-100 text-amber-800 text-sm px-4 py-2 text-center w-full">
      You are offline. Some features are unavailable.
    </div>
  )
}
