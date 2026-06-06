import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/useStore'
import Header from './components/Layout/Header'
import Home from './pages/Home'
import Watch from './pages/Watch'

export default function App() {
  const { darkMode, loadChannels } = useStore()

  // Apply dark/light class
  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('dark', darkMode)
    html.style.colorScheme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  useEffect(() => {
    async function boot() {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.ready
          // clients.claim() fires after activate; wait for controller to be set
          if (!navigator.serviceWorker.controller) {
            await Promise.race([
              new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })),
              new Promise(r => setTimeout(r, 800)),  // don't block more than 800 ms
            ])
          }
        } catch {}
      }
      loadChannels()
    }
    boot()
  }, [])

  return (
    <BrowserRouter>
      <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-dark-900 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <Header />
        <div className="flex flex-1 overflow-hidden min-h-0" style={{ height: 'calc(100vh - 64px)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/watch/:id" element={<Watch />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
