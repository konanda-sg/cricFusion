import { AnimatePresence, motion } from 'framer-motion'

export default function SubtitleOverlay({ text, interim, controlsVisible }) {
  const hasContent = Boolean(text || interim)
  return (
    <AnimatePresence>
      {hasContent && (
        <motion.div
          key="sub"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className={`absolute left-0 right-0 flex justify-center px-6 pointer-events-none z-10 transition-[bottom] duration-300 ${
            controlsVisible ? 'bottom-[88px]' : 'bottom-4'
          }`}
        >
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 max-w-[90%] text-center space-y-0.5">
            {text && (
              <p className="text-white text-sm md:text-base font-medium leading-snug drop-shadow">
                {text}
              </p>
            )}
            {interim && (
              <p className="text-white/50 text-sm italic leading-snug">
                {interim}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
