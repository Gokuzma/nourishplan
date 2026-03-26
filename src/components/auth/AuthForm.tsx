import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ResetModal } from './ResetModal'

type Mode = 'login' | 'signup'

export function AuthForm() {
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        })
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    const from = (location.state as { from?: Location })?.from
    const redirectPath = from ? `${from.pathname}${from.search}` : '/'
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    })
    if (error) setError(error.message)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-[--radius-btn] border border-secondary px-4 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-[--radius-btn] border border-secondary px-4 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {mode === 'signup' && (
          <p className="text-xs text-text/50 -mt-2">Must be at least 6 characters</p>
        )}
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-[--radius-btn] border border-secondary px-4 py-2 bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        )}

        {error && (
          <p className="text-sm text-accent" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-[--radius-btn] bg-primary text-white font-semibold py-2 px-4 hover:opacity-90 disabled:opacity-60"
        >
          {mode === 'login' ? 'Log In' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={handleGoogle}
          className="rounded-[--radius-btn] border border-secondary bg-surface text-text font-semibold py-2 px-4 hover:bg-secondary"
        >
          Continue with Google
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
            className="text-primary hover:underline"
          >
            {mode === 'login' ? 'Sign Up' : 'Log In'}
          </button>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="text-accent hover:underline"
            >
              Forgot password?
            </button>
          )}
        </div>
      </form>

      {showReset && <ResetModal onClose={() => setShowReset(false)} />}
    </>
  )
}
