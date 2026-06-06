import { motion } from 'framer-motion'
import { Check, Zap } from 'lucide-react'

export default function QualityMenu({ levels, current, onSelect, onClose }) {
  return (
    <>
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-20 right-4 glass-dark rounded-xl overflow-hidden shadow-2xl z-50 min-w-[140px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-white/10">
          <p className="text-white/60 text-xs font-medium">Video Quality</p>
        </div>
        <div className="py-1">
          {levels.map((level) => (
            <button
              key={level.id}
              onClick={() => onSelect(level.id)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                {level.label === 'Auto' && <Zap size={12} className="text-brand-400" />}
                <span className="text-white text-sm">{level.label}</span>
              </div>
              {current === level.label && (
                <Check size={14} className="text-brand-400" />
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  )
}
