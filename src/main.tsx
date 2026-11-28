import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Installable app build (VITE_APP_SHELL=mobile): the franchisee app is the only screen, so start on /mobile.
if (import.meta.env.VITE_APP_SHELL === 'mobile' && !window.location.pathname.startsWith('/mobile')) {
  window.history.replaceState(null, '', '/mobile')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
