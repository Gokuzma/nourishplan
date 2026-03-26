import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // getSession() returns cached session from localStorage without server
    // validation. Verify it's still valid by calling getUser() which hits
    // the server. If the account was deleted, sign out to clear stale state.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { error } = await supabase.auth.getUser()
        if (error) {
          await supabase.auth.signOut()
          queryClient.clear()
          setSession(null)
          setLoading(false)
          return
        }
      }
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    queryClient.clear()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
