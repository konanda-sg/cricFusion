import { useRef, useState, useEffect } from 'react'

const ENABLED   = false   // set true to re-enable pull-to-refresh
const THRESHOLD = 110

export function usePullToRefresh(onRefresh) {
  const containerRef = useRef(null)
  const startYRef    = useRef(0)
  const pullingRef   = useRef(false)
  const pullDistRef  = useRef(0)
  const [pullY, setPullY]         = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (!ENABLED) return

    const onTouchStart = (e) => {
      startYRef.current = e.touches[0].clientY
      // Only arm if truly at the top (< 1 for iOS subpixel safety)
      pullingRef.current = el.scrollTop < 1
    }

    const onTouchMove = (e) => {
      if (!pullingRef.current) return

      // Live check — if the user scrolled down since touchstart, disarm
      if (el.scrollTop > 0) {
        pullingRef.current = false
        pullDistRef.current = 0
        setPullY(0)
        return
      }

      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        pullingRef.current = false
        pullDistRef.current = 0
        setPullY(0)
        return
      }
      e.preventDefault()
      const clamped = Math.min(delta, THRESHOLD + 24)
      pullDistRef.current = clamped
      setPullY(clamped)
    }

    const onTouchEnd = async () => {
      if (!pullingRef.current) return
      const dist = pullDistRef.current
      pullingRef.current = false
      pullDistRef.current = 0
      setPullY(0)
      // Final guard: only reload if still at the very top when finger lifts
      if (dist >= THRESHOLD && el.scrollTop < 1) {
        setRefreshing(true)
        try { await onRefresh?.() } catch {}
        setRefreshing(false)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh])

  return { containerRef, pullY, refreshing, threshold: THRESHOLD }
}
