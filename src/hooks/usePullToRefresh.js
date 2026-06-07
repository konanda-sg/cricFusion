import { useRef, useState, useEffect } from 'react'

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

    const onTouchStart = (e) => {
      if (el.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY
        pullingRef.current = true
      } else {
        pullingRef.current = false
      }
    }

    const onTouchMove = (e) => {
      if (!pullingRef.current) return
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
      if (dist >= THRESHOLD) {
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
