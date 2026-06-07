import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, Trophy, UserCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const TABS = [
  { id: 'home',    label: 'Home',       icon: Home,        path: '/' },
  { id: 'search',  label: 'Search',     icon: Search,      path: '/search' },
  { id: 'sports',  label: 'All Sports', icon: Trophy,      path: '/sports' },
  { id: 'account', label: 'Account',    icon: UserCircle,  path: '/account' },
]

export default function BottomNav() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  const isActive = (path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/[0.08]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.path)
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.86 }}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 relative pt-1"
            >
              {/* Active indicator line at top */}
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full"
                  style={{ background: '#c8ff00' }}
                />
              )}

              <tab.icon
                size={24}
                strokeWidth={active ? 2.5 : 1.5}
                color={active ? '#c8ff00' : 'rgba(255,255,255,0.35)'}
              />
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: active ? '#c8ff00' : 'rgba(255,255,255,0.35)' }}
              >
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
