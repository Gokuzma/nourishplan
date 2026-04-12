/**
 * Fire a notification when a passive cook step timer completes.
 * Uses ServiceWorkerRegistration.showNotification for cross-tab persistence (D-25).
 * Falls back to foreground Notification constructor if SW unavailable.
 * Returns true if notification was dispatched, false otherwise.
 */
export async function fireStepDoneNotification(
  mealName: string,
  stepText: string,
): Promise<boolean> {
  // Guard: Notification API must exist and be granted
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return false
  }

  try {
    // Prefer service worker so notification fires even if tab is hidden/closed
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(`${mealName} — step done`, {
      body: stepText,
      tag: `cook-step-${mealName}-${Date.now()}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      requireInteraction: false,
    })
    return true
  } catch {
    // Fallback: foreground Notification (will fail silently if tab is closed)
    try {
      new Notification(`${mealName} — step done`, {
        body: stepText,
        tag: `cook-step-${mealName}`,
      })
      return true
    } catch {
      return false
    }
  }
}

/**
 * Play an audible chime for in-app timer alert (R-03 fallback).
 * Uses a short system beep via AudioContext — no external audio file needed.
 * Respects device mute via AudioContext state check.
 */
export function playTimerChime(): void {
  try {
    const ctx = new AudioContext()
    // If AudioContext is suspended (muted/autoplay policy), skip silently
    if (ctx.state === 'suspended') {
      ctx.close()
      return
    }
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880 // A5 note — pleasant kitchen timer tone
    gain.gain.value = 0.3     // moderate volume
    osc.start()
    // Two short beeps: 150ms on, 100ms off, 150ms on
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.25)
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.4)
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => ctx.close()
  } catch {
    // AudioContext not available — skip silently
  }
}
