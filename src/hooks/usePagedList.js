import { useState, useEffect, useCallback, useRef } from 'react'

const PAGE_SIZE = 50

export function usePagedList(list, containerRef) {
  const [page, setPage] = useState(1)
  const observerRef = useRef(null)

  // Reset to page 1 whenever the source list changes (tab switch, search, etc.)
  useEffect(() => { setPage(1) }, [list])

  const visible = list.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < list.length

  const sentinelRef = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node || !hasMore) return

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPage((p) => p + 1) },
      { root: containerRef?.current ?? null, rootMargin: '400px' }
    )
    obs.observe(node)
    observerRef.current = obs
  }, [hasMore, containerRef])

  return { visible, hasMore, sentinelRef }
}
