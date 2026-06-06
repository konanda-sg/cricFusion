import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play, Users, Zap, Star } from 'lucide-react'
import { useStore } from '../../store/useStore'

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 4 + 2,
  duration: Math.random() * 4 + 3,
  delay: Math.random() * 2,
}))

export default function HeroSection() {
  const navigate = useNavigate()
  const channels = useStore((s) => s.channels)
  const match = channels.find((c) => c.isLive) ?? channels[0]
  if (!match) return null

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl mb-8" style={{ minHeight: 320 }}>
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={match.thumbnail}
          alt={match.currentMatch}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-900 via-dark-900/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-dark-900/40" />
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-brand-500/20"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Animated gradient orbs */}
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-48 h-48 bg-red-500/10 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

      {/* Content */}
      <div className="relative z-10 px-6 py-8 md:px-10 md:py-12 flex flex-col justify-end h-full min-h-[320px]">
        <div className="max-w-xl space-y-4">
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg shadow-red-600/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE NOW
            </div>
            <div className="flex items-center gap-1 text-white/60 text-sm">
              <Users size={14} />
              <span>{match.viewers} watching</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-black text-white leading-tight"
            style={{ fontFamily: 'Oswald, sans-serif' }}
          >
            {match.currentMatch}
          </motion.h1>

          {/* Score */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="glass text-white text-sm font-bold px-3 py-1.5 rounded-lg">
              {match.score}
            </div>
            <div className="flex items-center gap-1 text-brand-400 text-xs">
              <Zap size={12} />
              <span>{match.badge}</span>
            </div>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/60 text-sm line-clamp-2"
          >
            {match.description}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/watch/${match.id}`)}
              className="flex items-center gap-2 gradient-brand text-white font-bold px-6 py-3 rounded-xl shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 transition-shadow"
            >
              <Play size={18} className="fill-white" />
              Watch Live
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 glass text-white font-medium px-5 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <Star size={16} />
              Favourite
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
