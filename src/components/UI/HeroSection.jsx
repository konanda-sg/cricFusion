import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useStore } from '../../store/useStore'

// Colour "vs" in the match title neon yellow
function MatchTitle({ title }) {
  const parts = title.split(/(\bvs\.?\b)/i)
  return (
    <h1
      className="text-white font-black text-3xl md:text-5xl leading-tight"
      style={{ fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase' }}
    >
      {parts.map((part, i) =>
        /\bvs\.?\b/i.test(part)
          ? <span key={i} style={{ color: '#c8ff00' }}>{part}</span>
          : part
      )}
    </h1>
  )
}

const INTERVAL_MS = 5000

export default function HeroSection() {
  const navigate    = useNavigate()
  const channels    = useStore((s) => s.channels)
  const liveList    = channels.filter((c) => c.isLive).slice(0, 6)
  const [idx, setIdx]     = useState(0)
  const [imgFailed, setImgFailed] = useState(false)

  const total = liveList.length
  const match = liveList[idx] ?? liveList[0]

  // Reset image-failed flag whenever slide changes
  useEffect(() => { setImgFailed(false) }, [idx])

  // Auto-advance
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total])
  useEffect(() => {
    if (total <= 1) return
    const t = setInterval(next, INTERVAL_MS)
    return () => clearInterval(t)
  }, [total, next])

  if (!match) return null

  return (
    <div className="relative overflow-hidden bg-black" style={{ height: 'clamp(340px, 58vw, 520px)' }}>

      {/* Background image with crossfade */}
      <AnimatePresence mode="sync">
        <motion.div
          key={match.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
        >
          {!imgFailed && match.thumbnail ? (
            <img
              src={match.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="w-full h-full bg-dark-800" />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.25) 100%)' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end px-5 pb-7 md:px-10 md:pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38 }}
            className="space-y-3 max-w-lg"
          >
            {/* LIVE badge */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-white font-bold text-xs tracking-[0.2em] uppercase">Live</span>
              {match.viewers && (
                <span className="text-white/40 text-xs ml-1">· {match.viewers} watching</span>
              )}
            </div>

            {/* Match title */}
            <MatchTitle title={match.currentMatch} />

            {/* Score / description */}
            {(match.score || match.description) && (
              <p className="text-white/60 text-sm leading-relaxed line-clamp-2">
                {match.score || match.description}
              </p>
            )}

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/watch/${match.id}`)}
              className="flex items-center justify-center gap-2 text-white font-semibold text-sm px-8 py-3 rounded-full border border-white/20 transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', minWidth: 200 }}
            >
              <Play size={16} className="fill-white flex-shrink-0" />
              Watch Now
            </motion.button>
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        {total > 1 && (
          <div className="flex items-center gap-2 mt-5">
            {liveList.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === idx ? 24 : 16,
                  background: i === idx ? '#c8ff00' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
