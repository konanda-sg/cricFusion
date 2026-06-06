import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { categories } from '../../data/channels'

export default function CategoryTabs() {
  const { activeCategory, setActiveCategory } = useStore()

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {categories.map((cat) => (
        <motion.button
          key={cat.id}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveCategory(cat.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
            activeCategory === cat.id
              ? 'gradient-brand text-white shadow-lg shadow-brand-500/30'
              : 'bg-dark-700 text-white/60 hover:text-white hover:bg-dark-600 border border-white/[0.06]'
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
          {activeCategory === cat.id && (
            <motion.span
              layoutId="cat-indicator"
              className="hidden"
            />
          )}
        </motion.button>
      ))}
    </div>
  )
}
