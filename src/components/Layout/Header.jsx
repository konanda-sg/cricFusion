import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sun, Moon, Menu, X, Tv2, Bell, RefreshCw } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Link, useNavigate } from 'react-router-dom'

export default function Header() {
  const { darkMode, toggleDarkMode, searchQuery, setSearchQuery, toggleSidebar, refreshChannels, channelsLoading } = useStore()
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    navigate('/')
  }

  const textMuted = darkMode ? 'text-white/60' : 'text-slate-500'
  const textHover = darkMode ? 'hover:text-white hover:bg-white/10' : 'hover:text-slate-900 hover:bg-black/05'
  const inputBg = darkMode ? 'bg-dark-700 border-white/[0.06]' : 'bg-white border-slate-200'
  const inputFocusBg = darkMode ? 'bg-dark-600 border-brand-500/50 shadow-brand-500/10' : 'bg-white border-brand-400/70 shadow-brand-500/10'
  const inputText = darkMode ? 'text-white placeholder-white/30' : 'text-slate-900 placeholder-slate-400'
  const mobileMenuBg = darkMode ? 'bg-dark-900 border-white/[0.06]' : 'bg-white border-slate-200'

  return (
    <header className={`sticky top-0 z-50 border-b ${darkMode ? 'glass-dark border-white/[0.06]' : 'bg-white/90 backdrop-blur-lg border-slate-200'}`}>
      <div className="max-w-screen-2xl mx-auto px-4 h-14 md:h-16 flex items-center gap-3 md:gap-4">

        {/* Sidebar toggle */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={toggleSidebar}
          className={`hidden md:flex w-9 h-9 items-center justify-center rounded-lg transition-colors ${textMuted} ${textHover}`}>
          <Menu size={20} />
        </motion.button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-lg group-hover:shadow-brand-500/50 transition-shadow">
            <Tv2 size={16} className="text-white" />
          </div>
          <div className="flex items-baseline gap-0">
            <span className="font-black text-lg tracking-tight" style={{ fontFamily: 'Oswald, sans-serif', color: darkMode ? '#fff' : '#0f172a' }}>
              CRIC
            </span>
            <span className="font-black text-lg gradient-text tracking-tight" style={{ fontFamily: 'Oswald, sans-serif' }}>
              FUSION
            </span>
          </div>
        </Link>

        {/* Live badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-red-600/15 border border-red-500/30 text-red-400 text-xs font-bold px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          LIVE
        </div>

        {/* Search (desktop) */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden sm:block">
          <motion.div animate={{ scale: searchFocused ? 1.01 : 1 }}
            className={`relative flex items-center rounded-xl border transition-all ${searchFocused ? `${inputFocusBg} shadow-lg` : inputBg}`}>
            <Search size={15} className="absolute left-3 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search channels, sports…"
              className={`w-full bg-transparent text-sm py-2 pl-9 pr-4 outline-none ${inputText}`}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </form>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1 md:gap-1.5">
          {/* Refresh channels / token */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={refreshChannels}
            title="Refresh channel tokens"
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${textMuted} ${textHover}`}>
            <RefreshCw size={16} className={channelsLoading ? 'animate-spin' : ''} />
          </motion.button>

          {/* Bell */}
          <motion.button whileTap={{ scale: 0.9 }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors relative ${textMuted} ${textHover}`}>
            <Bell size={18} />
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full border-2 ${darkMode ? 'border-dark-900' : 'border-white'}`} />
          </motion.button>

          {/* Dark / light toggle */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggleDarkMode}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${textMuted} ${textHover}`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            <AnimatePresence mode="wait">
              {darkMode
                ? <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun size={18} />
                  </motion.div>
                : <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon size={18} />
                  </motion.div>
              }
            </AnimatePresence>
          </motion.button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-black cursor-pointer shadow-md">
            CF
          </div>

          {/* Mobile hamburger */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMobileMenuOpen((v) => !v)}
            className={`sm:hidden w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${textMuted} ${textHover}`}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </div>

      {/* Mobile search dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`sm:hidden border-t px-4 py-3 ${mobileMenuBg}`}
          >
            <form onSubmit={handleSearch}>
              <div className={`relative flex items-center rounded-xl border ${inputBg}`}>
                <Search size={15} className="absolute left-3 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); navigate('/') }}
                  placeholder="Search channels, sports…"
                  className={`w-full bg-transparent text-sm py-2.5 pl-9 pr-4 outline-none ${inputText}`}
                  autoFocus
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400">
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
