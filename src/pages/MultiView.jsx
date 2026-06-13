import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Search, Radio, LayoutGrid, Tv2 } from 'lucide-react'
import MiniPlayer from '../components/Player/MiniPlayer'
import { useStore } from '../store/useStore'

function ChannelPicker({ onSelect, onClose, excludeIds }) {
  const { channels } = useStore()
  const [q, setQ] = useState('')

  const live = useMemo(() =>
    channels.filter((c) =>
      c.isLive && !excludeIds.includes(c.id) &&
      (!q.trim() ||
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.currentMatch.toLowerCase().includes(q.toLowerCase()))
    ), [channels, excludeIds, q])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-dark-800 rounded-t-3xl sm:rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07] flex-shrink-0">
          <div>
            <p className="text-white font-bold text-base">Choose Stream</p>
            <p className="text-white/40 text-xs mt-0.5">{live.length} channels live now</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center transition-colors">
            <X size={15} className="text-white/60" />
          </button>
        </div>

        <div className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 bg-white/[0.06] border border-white/[0.07] rounded-xl px-3 py-2.5">
            <Search size={14} className="text-white/35 flex-shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search channels or matches…"
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {live.length === 0 ? (
            <div className="py-12 text-center">
              <Tv2 size={28} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No live channels found</p>
            </div>
          ) : (
            live.map((ch) => (
              <motion.button
                key={ch.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(ch)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.05] transition-colors"
              >
                <div className="w-11 h-8 rounded-lg bg-dark-700 border border-white/[0.07] flex items-center justify-center text-[10px] font-black text-white/70 flex-shrink-0">
                  {ch.logo}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white/85 text-sm font-semibold truncate">{ch.name}</p>
                  <p className="text-white/40 text-xs truncate mt-0.5">{ch.currentMatch}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-white/30 text-[10px] font-semibold">LIVE</span>
                </div>
              </motion.button>
            ))
          )}
          <div className="h-4" />
        </div>
      </motion.div>
    </motion.div>
  )
}

function EmptySlot({ onAdd, index }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onAdd}
      className="w-full h-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02]
                 hover:border-brand-500/50 hover:bg-brand-500/[0.05]
                 flex flex-col items-center justify-center gap-3 transition-all duration-300 group"
    >
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] group-hover:bg-brand-500/15
                      border border-white/[0.06] group-hover:border-brand-500/30
                      flex items-center justify-center transition-all duration-300">
        <Plus size={24} className="text-white/20 group-hover:text-brand-500 transition-colors duration-300" />
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-white/25 text-xs font-semibold group-hover:text-white/50 transition-colors">Stream {index + 1}</p>
        <p className="text-white/12 text-[10px] group-hover:text-white/25 transition-colors">Add live channel</p>
      </div>
    </motion.button>
  )
}

export default function MultiView() {
  const navigate = useNavigate()
  const [slots, setSlots]             = useState([null, null, null, null])
  const [activeAudio, setActiveAudio] = useState(0)
  const [pickerSlot, setPickerSlot]   = useState(null)

  const filledCount = slots.filter(Boolean).length
  const excludeIds  = slots.filter(Boolean).map((c) => c.id)

  const assignChannel = (ch) => {
    setSlots((prev) => { const next = [...prev]; next[pickerSlot] = ch; return next })
    if (filledCount === 0) setActiveAudio(pickerSlot)
    setPickerSlot(null)
  }

  const removeSlot = (i) => {
    setSlots((prev) => { const next = [...prev]; next[i] = null; return next })
    if (activeAudio === i) {
      const next = slots.findIndex((s, si) => s && si !== i)
      setActiveAudio(next >= 0 ? next : 0)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/15 flex items-center justify-center flex-shrink-0">
            <LayoutGrid size={15} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-white font-black text-sm leading-tight" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.05em' }}>
              MULTI-VIEW
            </h1>
            <p className="text-white/30 text-[10px] leading-tight">Up to 4 simultaneous streams</p>
          </div>
          {filledCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full"
            >
              <Radio size={8} className="animate-pulse" /> {filledCount} LIVE
            </motion.span>
          )}
        </div>
        {filledCount > 0 && (
          <p className="text-white/20 text-[10px] hidden sm:block">Tap stream to switch audio</p>
        )}
      </div>

      {/* 2×2 Grid — always rendered */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 p-3 md:p-4 min-h-0">
        {slots.map((ch, i) => (
          <div key={i} className="relative min-h-0">
            <AnimatePresence mode="wait">
              {ch ? (
                <motion.div
                  key={ch.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0"
                >
                  <MiniPlayer
                    channel={ch}
                    isAudioActive={activeAudio === i}
                    onActivate={() => setActiveAudio(i)}
                    onRemove={() => removeSlot(i)}
                    onExpand={() => navigate(`/watch/${ch.id}`)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`empty-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <EmptySlot onAdd={() => setPickerSlot(i)} index={i} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Channel Picker */}
      <AnimatePresence>
        {pickerSlot !== null && (
          <ChannelPicker
            onSelect={assignChannel}
            onClose={() => setPickerSlot(null)}
            excludeIds={excludeIds}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
