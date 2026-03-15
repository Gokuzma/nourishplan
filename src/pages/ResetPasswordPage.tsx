import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setExpired(true)
    }, 10000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timeout)
        setReady(true)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    navigate('/')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans">
        {expired ? (
          <div className="text-center">
            <p className="text-text/70 mb-4">
              Reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/auth" className="text-primary underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <p className="text-text/60">Verifying reset link...</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">NourishPlan</h1>
        </div>
        <div className="bg-surface rounded-[--radius-card] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-text mb-4">Set New Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-accent/30 rounded-lg px-3 py-2 text-text bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="password"
              required
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full border border-accent/30 rounded-lg px-3 py-2 text-text bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {error && (
              <p role="alert" className="text-red-600 text-sm">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white font-medium py-2.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Updating…' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
