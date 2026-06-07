import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff, Wifi, X, RefreshCw } from 'lucide-react'
import { useStore } from './store/useStore'
import Header from './components/Layout/Header'
import BottomNav from './components/Layout/BottomNav'
import Home from './pages/Home'
import Search from './pages/Search'
import Sports from './pages/Sports'
import Account from './pages/Account'
import Watch from './pages/Watch'

// Inner component so useLocation works inside BrowserRouter
function AppContent() {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-dvh bg-black text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100dvh - 56px)' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex flex-1 w-full overflow-hidden"
          >
            <Routes location={location}>
              <Route path="/"         element={<Home />} />
              <Route path="/search"   element={<Search />} />
              <Route path="/sports"   element={<Sports />} />
              <Route path="/account"  element={<Account />} />
              <Route path="/watch/:id" element={<Watch />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { darkMode, loadChannels, refreshChannels } = useStore()
  const [isOnline, setIsOnline]           = useState(navigator.onLine)
  const [offlineDismissed, setDismissed]  = useState(false)
  const [showOnlineToast, setOnlineToast] = useState(false)

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
          if (!navigator.serviceWorker.controller) {
            await Promise.race([
              new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })),
              new Promise(r => setTimeout(r, 800)),
            ])
          }
        } catch {}
      }
      loadChannels()
    }
    boot()
  }, [])

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      setOnlineToast(true)
      refreshChannels()
      setTimeout(() => setOnlineToast(false), 3000)
    }
    const goOffline = () => { setIsOnline(false); setDismissed(false) }
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>

      {/* ── Offline overlay ── */}
      <AnimatePresence>
        {!isOnline && !offlineDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] bg-dark-900/95 backdrop-blur-sm flex flex-col items-center justify-center px-8 text-center"
          >
            {/* Close button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setDismissed(true)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center"
            >
              <X size={16} className="text-white/50" />
            </motion.button>

            <motion.div
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-dark-700 flex items-center justify-center mb-6 border border-white/[0.07]"
            >
              <WifiOff size={36} className="text-white/30" />
            </motion.div>
            <h2 className="text-white font-bold text-xl mb-2">No Connection</h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Check your internet. Streams will resume automatically when you're back online.
            </p>

            <div className="flex items-center gap-3 mt-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-semibold">Offline</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => refreshChannels()}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/60 text-sm font-semibold hover:text-white transition-colors"
              >
                <RefreshCw size={13} />
                Retry
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Back-online toast ── */}
      <AnimatePresence>
        {showOnlineToast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-20 inset-x-0 z-[200] flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 bg-brand-500 text-black px-4 py-2 rounded-full font-bold text-sm shadow-xl">
              <Wifi size={14} />
              Back online
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
