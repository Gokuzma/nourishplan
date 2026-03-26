import { useState, useEffect } from 'react'

const PROMPT_STORAGE_KEY = 'pwa-prompt-shown'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if already installed or already shown
    if (isStandalone()) return
    if (localStorage.getItem(PROMPT_STORAGE_KEY)) return

    if (isIOS()) {
      const timer = setTimeout(() => setShowIOSPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  // Show Chrome prompt after delay once event is captured
  useEffect(() => {
    if (!deferredPrompt) return
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [deferredPrompt])

  function dismiss() {
    localStorage.setItem(PROMPT_STORAGE_KEY, '1')
    setVisible(false)
    setShowIOSPrompt(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    localStorage.setItem(PROMPT_STORAGE_KEY, '1')
    setVisible(false)
    setDeferredPrompt(null)
  }

  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-50 bg-surface border-t border-accent/30 px-4 py-3 flex items-center justify-between gap-3 shadow-md">
        <p className="text-sm text-text flex-1">
          Install NourishPlan: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>.
        </p>
        <button
          onClick={dismiss}
          className="text-sm text-text/50 hover:text-text shrink-0"
          aria-label="Dismiss install prompt"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (visible && deferredPrompt) {
    return (
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-50 bg-surface border-t border-accent/30 px-4 py-3 flex items-center justify-between gap-3 shadow-md">
        <p className="text-sm text-text flex-1">
          Add NourishPlan to your home screen for the best experience.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="text-sm text-text/50 hover:text-text"
            aria-label="Dismiss install prompt"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return null
}
