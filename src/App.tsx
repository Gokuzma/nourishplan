import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useHousehold } from './hooks/useHousehold'
import { AuthPage } from './pages/AuthPage'
import { HouseholdSetup } from './pages/HouseholdSetup'
import { HouseholdPage } from './pages/HouseholdPage'
import { JoinHousehold } from './components/household/JoinHousehold'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

/**
 * Guard: redirect unauthenticated users to /auth.
 * Guard: redirect authenticated users without a household to /setup,
 * unless they are already on /setup or /join.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { data: membership, isPending: householdLoading } = useHousehold()
  const location = useLocation()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text/60 font-sans">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (householdLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text/60 font-sans">Loading…</p>
      </div>
    )
  }

  const isSetupRoute = location.pathname === '/setup' || location.pathname === '/join'
  if (!membership && !isSetupRoute) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

/**
 * Redirect already-authenticated users away from /auth.
 */
function GuestGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function JoinPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background px-4 py-12 font-sans">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-3xl font-bold text-primary">Join a Household</h1>
        <div className="rounded-card border border-accent/30 bg-surface p-6 shadow-sm">
          <JoinHousehold onSuccess={() => navigate('/')} />
        </div>
      </div>
    </div>
  )
}

function HomePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 font-sans flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">NourishPlan</h1>
        <p className="mt-2 text-text/60">Your household is set up. More features coming soon.</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Guest-only */}
      <Route
        path="/auth"
        element={
          <GuestGuard>
            <AuthPage />
          </GuestGuard>
        }
      />

      {/* Auth required, household not required */}
      <Route
        path="/setup"
        element={
          <AuthGuard>
            <HouseholdSetup />
          </AuthGuard>
        }
      />
      <Route
        path="/join"
        element={
          <AuthGuard>
            <JoinPage />
          </AuthGuard>
        }
      />

      {/* Auth + household required */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
      <Route
        path="/household"
        element={
          <AuthGuard>
            <HouseholdPage />
          </AuthGuard>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
