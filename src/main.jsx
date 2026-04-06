import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker registration with auto-update
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/system-techo/sw.js').then((reg) => {
    // Check for updates every 5 minutes
    setInterval(() => reg.update(), 5 * 60 * 1000);
  });
}
