import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface ResetModalProps {
  onClose: () => void
}

export function ResetModal({ onClose }: ResetModalProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div className="bg-surface rounded-[--radius-card] p-6 w-full max-w-sm shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text">Reset Password</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text/60 hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {success ? (
          <p className="text-sm text-text">
            Check your email for a password reset link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-[--radius-btn] border border-secondary px-4 py-2 bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
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
              Send Reset Link
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
