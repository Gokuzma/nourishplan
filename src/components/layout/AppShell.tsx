import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'
import { Sidebar } from './Sidebar'
import { OfflineBanner } from '../log/OfflineBanner'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — hidden on mobile, visible on md+ */}
      <Sidebar />

      {/* Main content area — min-w-0 prevents flex child from expanding past viewport when nested overflow-x-scroll content (e.g. DayCarousel) has wide intrinsic size */}
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        <OfflineBanner />
        <Outlet />
      </main>

      {/* TabBar — visible on mobile only */}
      <TabBar />
    </div>
  )
}
