export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans">
      <div className="text-center">
        <svg
          className="mx-auto mb-6 text-primary/50"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
        <h1 className="text-2xl font-semibold text-text mb-2">You're offline</h1>
        <p className="text-text/60 mb-8">Check your internet connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-block bg-primary text-white font-medium px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
