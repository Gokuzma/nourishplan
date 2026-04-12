---
phase: 23
plan: "07"
subsystem: cook-mode
tags: [pwa, notifications, service-worker, timers, cross-platform]
depends_on: [23-01, 23-03, 23-03b, 23-06, 23-06b]
dependency_graph:
  requires:
    - 23-03b: useNotificationPermission hook with 7-day cooldown
    - 23-06: CookModePage with D-21 flow branching and useCookSession
    - 23-06b: CookStepTimer and step-level components
  provides:
    - NotificationPermissionBanner: inline prompt with Allow/Not now, denied state, cooldown
    - CookTimerNotifications: SW showNotification dispatch + AudioContext chime
    - InAppTimerAlert: fixed overlay visual alert for mandatory in-app fallback
    - CookModePage: timer_started_at persistence, notification wiring, in-app alert integration
  affects:
    - src/pages/CookModePage.tsx
tech_stack:
  added:
    - Web Notifications API via ServiceWorkerRegistration.showNotification
    - AudioContext for audible chime (R-03 in-app fallback)
  patterns:
    - Notification permission prompt gated on first passive step timer start (not page load)
    - Dual delivery: OS notification (D-25) + mandatory in-app fallback (R-03)
    - timer_started_at persisted in cook_sessions.step_state for cross-tab resume
key_files:
  created:
    - src/components/cook/NotificationPermissionBanner.tsx
    - src/components/cook/CookTimerNotifications.ts
    - src/components/cook/InAppTimerAlert.tsx
  modified:
    - src/pages/CookModePage.tsx
decisions:
  - "Notification prompt shows on first passive step timer start (not page load) per UI-SPEC line 317 — prevents permission-prompt fatigue"
  - "In-app fallback (chime + visual alert) fires ALWAYS regardless of notification permission — R-03 is a hard requirement not an optional enhancement"
  - "7-day cooldown stored in localStorage under cook-notification-dismissed-at — shared key between useNotificationPermission hook and NotificationPermissionBanner for consistent cooldown enforcement"
  - "AudioContext created fresh per chime invocation and closed after 0.5s — no persistent audio resources, suspended-state guard prevents errors on muted devices"
  - "timerIntervalRef drives countdown entirely client-side; timer_started_at persisted server-side for cross-tab resume — avoids polling Supabase on every second tick"
metrics:
  completed_date: "2026-04-12"
  tasks: 2
  files_created: 3
  files_modified: 1
requirements: [PREP-02]
---

# Phase 23 Plan 07: Cook Mode Notifications and Timer Alerts Summary

PWA notification support and mandatory in-app timer alert fallbacks for Cook Mode. Users receive timely alerts when passive cooking step timers complete — either via OS notifications when permission is granted, or always via audible chime and visual overlay when the app is in the foreground.

## What Was Built

### NotificationPermissionBanner (src/components/cook/NotificationPermissionBanner.tsx)

Inline banner rendered above the active step card in CookModeShell. Appears only when the user taps "Start timer" on the first passive-wait step of a cook session. Two states:

- **Default (permission === 'default'):** Bell icon, "Get notified when timers finish" heading, explanatory body text, "Allow notifications" primary button (triggers `Notification.requestPermission()`), "Not now" secondary link (writes `cook-notification-dismissed-at` timestamp to localStorage).
- **Denied state:** Amber warning banner with "Notifications blocked. Turn them on in your browser settings to hear timers." text and dismiss button. Re-shown after 7-day cooldown.

The banner reads the `cook-notification-dismissed-at` key directly (same key the `useNotificationPermission` hook uses) to enforce the 7-day cooldown. If the cooldown has not expired, the banner does not render at all.

### CookTimerNotifications (src/components/cook/CookTimerNotifications.ts)

Utility module (not a React component) with two exported functions:

**`fireStepDoneNotification(mealName, stepText): Promise<boolean>`**
- Guards on `Notification.permission === 'granted'`
- Calls `navigator.serviceWorker.ready` then `reg.showNotification(...)` with `icon: '/icon-192.png'`, `badge: '/icon-192.png'`, `requireInteraction: false`, and a unique `tag` per firing to avoid deduplication collisions (T-23-13)
- Falls back to foreground `new Notification(...)` constructor if SW is unavailable
- Returns `false` if permission not granted or all paths fail

**`playTimerChime(): void`**
- Creates `AudioContext`, checks for `suspended` state (device muted/autoplay policy), plays two short 880Hz beeps (150ms on, 100ms off, 150ms on) via OscillatorNode + GainNode, closes context after 0.5s
- All errors caught silently — audio failure never blocks timer completion

### InAppTimerAlert (src/components/cook/InAppTimerAlert.tsx)

Fixed overlay banner (`fixed top-0 inset-x-0 z-50`) rendered at the top-level return of CookModePage. Shows as a green (`bg-primary`) pill with bell icon, "Timer complete" heading, and `{mealName}: {stepText}` body. Auto-dismisses after 10 seconds via `setTimeout`. Manual dismiss via `×` button. Uses `animate-bounce` with 2s duration for 2 iterations to draw attention.

### CookModePage Wiring (src/pages/CookModePage.tsx)

Three new state variables:
- `showNotificationPrompt: boolean` — controls NotificationPermissionBanner visibility
- `timerAlert: { stepText, mealName } | null` — controls InAppTimerAlert visibility
- `notificationPromptShownRef: MutableRefObject<boolean>` — ensures prompt shows only once per session (not on every passive step)

One new ref:
- `timerIntervalRef: MutableRefObject<number | null>` — holds the `setInterval` handle; cleared on unmount

**Timer start flow** (in `handlePrimaryAction` when label is "Start timer"):
1. Persists `timer_started_at: new Date().toISOString()` to `cook_sessions.step_state` via `useUpdateCookStep`
2. On first passive step in the session, sets `showNotificationPrompt = true`
3. Starts `setInterval` (1s tick) that computes elapsed time vs. `totalMs`; when `elapsed >= totalMs`, calls `handleTimerComplete` and clears the interval

**Timer complete handler** (`handleTimerComplete`):
1. Calls `fireStepDoneNotification(recipeName, step.text)` — returns false if permission denied, true if OS notification dispatched
2. Always calls `playTimerChime()` (R-03 MANDATORY)
3. Always sets `timerAlert` state to show InAppTimerAlert overlay (R-03 MANDATORY)

## Notification Permission Flow

```
User taps "Start timer" on first passive step
  │
  ├─ notificationPromptShownRef.current === false?
  │   YES → setShowNotificationPrompt(true), set ref = true
  │   NO  → skip (already shown this session)
  │
  └─ NotificationPermissionBanner renders above step list
       ├─ "Allow notifications" → Notification.requestPermission()
       │    ├─ granted → onPermissionChange() → banner hides
       │    └─ denied  → banner switches to amber "blocked" state
       └─ "Not now" → localStorage.cook-notification-dismissed-at = now, banner hides
```

## Timer State Management

`timer_started_at` is an ISO timestamp written to `cook_sessions.step_state.steps[stepId]` when the timer starts. This enables:
- **Cross-tab resume:** If the user leaves and returns, the remaining time is recomputed from `timer_started_at` and the step's `duration_minutes`
- **Realtime sync:** Other household members cooking together see the timer start via the existing realtime subscription on `cook_sessions`

The client-side `setInterval` (1s) drives the visual countdown and fires `handleTimerComplete`. It is a display-only mechanism — the source of truth is `timer_started_at` in the database.

## Tab-Close Limitation

Documented in code comment near the timer logic:

> When the user closes the app tab while a timer is running, the service worker cannot fire a setTimeout to trigger showNotification at the correct time. The timer_started_at is persisted server-side, so when the user returns, the timer state is recomputed and if expired, the in-app fallback fires immediately. OS-level timer scheduling would require a background sync API or push notifications, which are out of scope for this phase.

## Cross-Platform Support

| Platform | OS Notification | In-App Alert | Notes |
|----------|----------------|--------------|-------|
| Chrome/Edge (desktop) | Yes (SW) | Always | Full support |
| Safari 16+ (desktop) | Yes (SW) | Always | macOS 13+ required for SW notifications |
| Chrome Android | Yes (SW) | Always | Works in background |
| Safari iOS 16.4+ | Yes (SW, installed PWA only) | Always | Must be installed to home screen |
| Firefox | Yes (SW) | Always | Full support |
| Permission denied (any) | No | Always | In-app is the universal fallback |
| Tab closed | No (SW cannot schedule) | On return (timer expired) | Documented limitation |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Adaptation: useNotificationPermission hook interface

The `useNotificationPermission` hook from Plan 23-03b has a richer interface than the plan's inline sketch shows — it exposes `fire()`, `dismiss()`, `shouldShowPrompt`, and uses `NotificationPermissionState` (not `NotificationPermission`) to include `'unsupported'`. The `NotificationPermissionBanner` was adapted to:
- Accept `onPermissionChange: (permission: NotificationPermissionState) => void` instead of `NotificationPermission`
- Use the hook's `dismiss()` alongside a direct `localStorage.setItem` write (to ensure `cook-notification-dismissed-at` is written with the same key the cooldown check reads)
- Not duplicate the `shouldShowPrompt` logic — the banner implements its own cooldown check directly to avoid coupling to hook internals

This is not a deviation from plan intent — it matches the spec behavior exactly.

## Known Stubs

None — all notification components are fully wired. The `timerIntervalRef` countdown drives live display updates in the existing inline step rendering in CookModePage (Plan 06b's `CookStepTimer` component handles its own display; the interval in CookModePage drives the completion event only).

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. The `showNotification` call is made from page context via `navigator.serviceWorker.ready` — this is the intended PWA pattern and was modeled in the plan's threat register (T-23-13 through T-23-17).

## Self-Check: PASSED

Files created:
- src/components/cook/NotificationPermissionBanner.tsx — FOUND
- src/components/cook/CookTimerNotifications.ts — FOUND
- src/components/cook/InAppTimerAlert.tsx — FOUND

Files modified:
- src/pages/CookModePage.tsx — FOUND

Commits:
- bb8588c — feat(23-07): add NotificationPermissionBanner, CookTimerNotifications, InAppTimerAlert — FOUND
- 4ea083c — feat(23-07): wire notification components into CookModePage timer flow — FOUND
