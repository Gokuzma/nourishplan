import { supabase } from './supabase'
import type { Json } from '../types/database.gen'

/**
 * Session-scoped gate: caps total reports and drops repeats of the same
 * message, so an error loop (e.g. expired session failing every query)
 * can't flood the table.
 */
export function createReportGate(maxReports: number) {
  const seen = new Set<string>()
  let count = 0
  return (message: string): boolean => {
    if (count >= maxReports) return false
    if (seen.has(message)) return false
    seen.add(message)
    count++
    return true
  }
}

const gate = createReportGate(20)

/**
 * Records a runtime error in client_errors. Fire-and-forget: never throws,
 * never blocks. Unauthenticated errors are dropped (RLS requires a user).
 */
export function reportError(source: string, error: unknown, context: Record<string, unknown> = {}) {
  void (async () => {
    try {
      const message = error instanceof Error ? error.message : String(error ?? '')
      if (!message || !gate(message)) return
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (!userId) return
      await supabase.from('client_errors').insert({
        user_id: userId,
        source,
        message: message.slice(0, 1000),
        stack: error instanceof Error && error.stack ? error.stack.slice(0, 4000) : null,
        // Round-trip guarantees the payload is valid Json (drops undefined etc.)
        context: JSON.parse(JSON.stringify(context)) as Json,
        url: window.location.href,
        user_agent: navigator.userAgent,
      })
    } catch {
      // Error reporting must never become an error source itself
    }
  })()
}

/**
 * Installs window-level handlers for uncaught errors and unhandled
 * promise rejections. Call once at app startup.
 */
export function installGlobalErrorReporting() {
  window.addEventListener('error', e => {
    reportError('window.onerror', e.error ?? e.message)
  })
  window.addEventListener('unhandledrejection', e => {
    reportError('unhandledrejection', e.reason)
  })
}
