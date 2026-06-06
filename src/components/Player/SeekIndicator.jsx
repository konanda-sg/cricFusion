import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function SeekIndicator({ type }) {
  return (
    <AnimatePresence>
      {type && (
        <motion.div
          key={type + Date.now()}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.25 }}
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-1 ${
            type === 'forward' ? 'right-1/4' : 'left-1/4'
          }`}
        >
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-1">
            {type === 'backward'
              ? <><ChevronLeft size={20} className="text-white" /><ChevronLeft size={20} className="text-white -ml-3" /></>
              : <><ChevronRight size={20} className="text-white" /><ChevronRight size={20} className="text-white -ml-3" /></>
            }
          </div>
          <span className="text-white text-xs font-medium bg-black/50 px-2 py-0.5 rounded">
            {type === 'forward' ? '+10s' : '-10s'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
