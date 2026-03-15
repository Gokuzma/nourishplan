import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useHousehold } from './hooks/useHousehold'
import { AuthPage } from './pages/AuthPage'
import { HouseholdSetup } from './pages/HouseholdSetup'
import { HouseholdPage } from './pages/HouseholdPage'
import { HomePage } from './pages/HomePage'
import { FoodsPage } from './pages/FoodsPage'
import { RecipesPage } from './pages/RecipesPage'
import { RecipePage } from './pages/RecipePage'
import { MealsPage } from './pages/MealsPage'
import { MealPage } from './pages/MealPage'
import { SettingsPage } from './pages/SettingsPage'
import { MemberTargetsPage } from './pages/MemberTargetsPage'
import { PlanPage } from './pages/PlanPage'
import { AppShell } from './components/layout/AppShell'
import { JoinHousehold } from './components/household/JoinHousehold'
import { InstallPrompt } from './components/log/InstallPrompt'

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

function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 font-sans flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary mb-2">Coming Soon</h1>
        <p className="text-text/60">This feature is not available yet.</p>
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

      {/* Auth + household required — wrapped in AppShell */}
      <Route
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/foods" element={<FoodsPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/recipes/:id" element={<RecipePage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/meals/:id" element={<MealPage />} />
        <Route path="/household" element={<HouseholdPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/members/:id/targets" element={<MemberTargetsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  useEffect(() => {
    const splash = document.getElementById('splash')
    if (!splash) return
    splash.classList.add('hidden')
    const onTransitionEnd = () => splash.remove()
    splash.addEventListener('transitionend', onTransitionEnd, { once: true })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <InstallPrompt />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
