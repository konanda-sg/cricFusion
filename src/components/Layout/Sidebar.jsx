import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { Users } from 'lucide-react'

export default function Sidebar({ currentChannelId }) {
  const { isSidebarOpen, channels } = useStore()
  const navigate = useNavigate()
  const activeRef = useRef(null)
  const liveChannels = channels.filter((c) => c.isLive)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentChannelId])

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="hidden md:flex flex-col h-full glass-dark border-r border-white/[0.06] overflow-hidden flex-shrink-0"
        >
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Live Now</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
            {liveChannels.map((ch) => (
              <motion.button
                key={ch.id}
                ref={currentChannelId === ch.id ? activeRef : null}
                whileHover={{ x: 4 }}
                onClick={() => navigate(`/watch/${ch.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mx-1 transition-colors ${
                  currentChannelId === ch.id
                    ? 'bg-brand-500/20 border border-brand-500/30'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                {/* Logo badge */}
                <div className={`w-10 h-7 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                  currentChannelId === ch.id ? 'gradient-brand text-white' : 'bg-dark-600 text-white/70'
                }`}>
                  {ch.logo}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-xs font-semibold truncate ${currentChannelId === ch.id ? 'text-brand-400' : 'text-white/80'}`}>
                    {ch.name}
                  </p>
                  <p className="text-white/40 text-[10px] truncate leading-snug">{ch.currentMatch}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <div className="flex items-center gap-0.5 text-white/30 text-[9px]">
                    <Users size={8} />
                    <span>{ch.viewers}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="text-center text-white/25 text-xs">
              {liveChannels.length} channels live
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
