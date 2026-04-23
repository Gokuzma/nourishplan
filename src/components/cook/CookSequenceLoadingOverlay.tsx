/**
 * Full-screen overlay shown while useGenerateCookSequence.isPending === true.
 * Parent controls mount/unmount via the mutation's isPending flag (UI-SPEC line 134).
 * Prop-less by design — no dismiss surface (D-04 permanent lockout until mutation resolves).
 */
export function CookSequenceLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Planning your cook session"
        tabIndex={-1}
        className="max-w-sm w-full bg-surface rounded-2xl shadow-xl p-6 flex flex-col gap-4 items-center text-center"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-12 w-12 text-primary animate-spin shrink-0"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6" strokeOpacity="0.3" />
          <path d="M8 2a6 6 0 0 1 6 6" strokeLinecap="round" />
        </svg>
        <p className="text-base font-semibold text-text">Planning your cook session…</p>
        <p className="text-sm text-text/60 font-sans">This usually takes a few seconds.</p>
      </div>
    </div>
  )
}
