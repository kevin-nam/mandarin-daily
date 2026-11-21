import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { load } from './store'
import { applyTheme } from './theme'
import { installTapGuard } from './tapGuard'

// Before the first paint, so a chosen theme never flashes the other one.
applyTheme(load().settings.theme)
installTapGuard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
