import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/nunito'
import './styles/global.css'
import App from './App.tsx'

// Force immediate update when new SW is available — no stale cache
registerSW({
  immediate: true,
  onNeedRefresh() {
    // New content available — reload immediately
    window.location.reload()
  },
  onOfflineReady() {
    // Offline ready — no action needed
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
