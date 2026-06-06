import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Users, Play, Tv2 } from 'lucide-react'

export default function ChannelCard({ channel, index = 0 }) {
  const navigate = useNavigate()
  const [imgFailed, setImgFailed] = useState(false)

  const badgeColor = {
    '4K': 'bg-purple-600 text-white',
    'HD': 'bg-blue-600 text-white',
    'LIVE': 'bg-red-600 text-white',
  }[channel.badge] || 'bg-dark-500 text-white/70'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      whileHover={{ y: -6 }}
      onClick={() => navigate(`/watch/${channel.id}`)}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-dark-800 border border-white/[0.06] hover:border-brand-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/15"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden aspect-video">
        {imgFailed ? (
          <div className="w-full h-full gradient-brand flex flex-col items-center justify-center gap-2">
            <Tv2 size={32} className="text-white/40" />
            <span className="text-white/50 text-xs font-bold tracking-wider">{channel.logo}</span>
          </div>
        ) : (
          <img
            src={channel.thumbnail}
            alt={channel.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 channel-overlay" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${badgeColor}`}>
            {channel.badge}
          </span>
          {channel.isLive && (
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-[10px] font-bold">LIVE</span>
            </div>
          )}
        </div>

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.div
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            className="w-14 h-14 gradient-brand rounded-full flex items-center justify-center shadow-2xl shadow-brand-500/50"
          >
            <Play size={22} className="text-white ml-1" />
          </motion.div>
        </div>

        {/* Score at bottom of image */}
        {channel.score && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="glass text-white text-xs px-2 py-1 rounded-lg font-medium truncate">
              {channel.score}
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Channel logo */}
          <div className="w-8 h-6 bg-dark-600 rounded flex items-center justify-center text-[9px] font-black text-white/60 flex-shrink-0">
            {channel.logo}
          </div>
          <p className="flex-1 text-white/50 text-xs font-medium truncate">{channel.name}</p>
          <div className="flex items-center gap-1 text-white/30 text-xs">
            <Users size={10} />
            <span>{channel.viewers}</span>
          </div>
        </div>

        <p className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand-300 transition-colors">
          {channel.currentMatch}
        </p>

        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs capitalize">{channel.language}</span>
          <span className="w-1 h-1 bg-white/20 rounded-full" />
          <span className="text-white/30 text-xs capitalize">{channel.category}</span>
        </div>
      </div>
    </motion.div>
  )
}
