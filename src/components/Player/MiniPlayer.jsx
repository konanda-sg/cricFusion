import { useRef, useEffect, useState } from 'react'
import Hls from 'hls.js'
import { Volume2, VolumeX, Maximize2, X, Radio, Wifi } from 'lucide-react'

export default function MiniPlayer({ channel, isAudioActive, onActivate, onRemove, onExpand }) {
  const videoRef = useRef(null)
  const hlsRef   = useRef(null)
  const shakaRef = useRef(null)
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(null)
  const [quality, setQuality]   = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video || !channel?.url) return
    let cancelled = false
    setLoading(true); setError(null); setQuality('')

    if (hlsRef.current)   { hlsRef.current.destroy();  hlsRef.current  = null }
    if (shakaRef.current) { shakaRef.current.destroy(); shakaRef.current = null }
    video.removeAttribute('src'); video.load()

    const isMPD = channel.url.includes('.mpd') || channel.url.includes('/api/tp-mpd')

    if (isMPD) {
      const shaka = window.shaka
      if (!shaka) { setError('Unsupported'); setLoading(false); return }
      shaka.polyfill.installAll()
      const player = new shaka.Player()
      shakaRef.current = player
      player.configure({
        streaming: { bufferingGoal: 15, rebufferingGoal: 3 },
        abr: { enabled: true, defaultBandwidthEstimate: 5_000_000 },
        ...(channel.clearKey ? { drm: { clearKeys: { [channel.clearKey.keyId]: channel.clearKey.key } } } : {}),
      })
      player.addEventListener('streaming', () => {
        if (cancelled) return
        const best = player.getVariantTracks().reduce((a, b) => (b.bandwidth ?? 0) > (a.bandwidth ?? 0) ? b : a, {})
        if (best?.height) setQuality(`${best.height}p`)
        setLoading(false)
      })
      player.addEventListener('adaptation', () => {
        const active = player.getVariantTracks().find((t) => t.active)
        if (active?.height) setQuality(`${active.height}p`)
      })
      player.addEventListener('error', () => { if (!cancelled) setError('Stream failed') })
      ;(async () => {
        try { await player.attach(video); await player.load(channel.url) }
        catch { if (!cancelled) setError('Failed to load') }
      })()
      return () => { cancelled = true; player.destroy(); shakaRef.current = null }
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true, lowLatencyMode: true, backBufferLength: 30,
        abrEwmaDefaultEstimate: 5_000_000, capLevelToPlayerSize: false,
      })
      hlsRef.current = hls
      hls.loadSource(channel.url); hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (cancelled) return
        const best = data.levels.reduce((bi, l, i) => (l.bitrate ?? 0) > (data.levels[bi]?.bitrate ?? 0) ? i : bi, 0)
        hls.startLevel = best; hls.currentLevel = best
        if (data.levels[best]?.height) setQuality(`${data.levels[best].height}p`)
        setLoading(false)
        video.play().catch(() => { video.muted = true; video.play().catch(() => {}) })
      })
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, { level }) => {
        const h = hls.levels?.[level]?.height
        if (h) setQuality(`${h}p`)
      })
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal && !cancelled) setError('Stream error') })
      return () => { cancelled = true; hls.destroy(); hlsRef.current = null }
    }

    video.src = channel.url
    video.play().catch(() => {})
    setLoading(false)
    return () => { cancelled = true }
  }, [channel?.url])

  useEffect(() => {
    const v = videoRef.current; if (!v) return
    v.muted = !isAudioActive
    if (!v.paused) return
    v.play().catch(() => {})
  }, [isAudioActive])

  const qualityColor = (() => {
    const h = parseInt(quality) || 0
    return h >= 1080 ? '#22c55e' : h >= 720 ? '#84cc16' : h >= 480 ? '#f59e0b' : h > 0 ? '#ef4444' : '#ffffff40'
  })()

  return (
    <div
      className="relative w-full h-full bg-dark-900 rounded-2xl overflow-hidden group cursor-pointer"
      onClick={onActivate}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline muted={!isAudioActive} autoPlay
      />

      {/* Loading spinner */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-dark-900">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-2 border-brand-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-brand-500 rounded-full animate-spin" />
          </div>
          <p className="text-white/30 text-[10px] font-medium">Loading stream…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-dark-900">
          <span className="text-3xl">📡</span>
          <p className="text-white/40 text-xs text-center px-4">{error}</p>
        </div>
      )}

      {/* Top gradient + controls */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-2.5
                      bg-gradient-to-b from-black/75 via-black/20 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Channel info */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex items-center gap-1 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0">
            <Radio size={7} className="animate-pulse" /> LIVE
          </span>
          <span className="text-white/80 text-[10px] font-semibold truncate drop-shadow">{channel?.name}</span>
        </div>

        {/* Remove */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-red-600 hover:border-red-500 transition-all flex-shrink-0 ml-1"
        >
          <X size={11} className="text-white" />
        </button>
      </div>

      {/* Bottom gradient + controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-2.5
                      bg-gradient-to-t from-black/80 via-black/20 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Audio button */}
        <button
          onClick={(e) => { e.stopPropagation(); onActivate() }}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all ${
            isAudioActive
              ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/30'
              : 'bg-black/60 text-white/60 border border-white/10 hover:bg-white/10'
          }`}
        >
          {isAudioActive ? <Volume2 size={11} /> : <VolumeX size={11} />}
          {isAudioActive ? 'Audio On' : 'Audio Off'}
        </button>

        <div className="flex items-center gap-1.5">
          {/* Quality badge */}
          {quality && (
            <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-full px-2 py-1">
              <Wifi size={9} style={{ color: qualityColor }} />
              <span className="text-white/70 text-[9px] font-bold">{quality}</span>
            </div>
          )}

          {/* Expand */}
          <button
            onClick={(e) => { e.stopPropagation(); onExpand() }}
            className="w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <Maximize2 size={11} className="text-white/70" />
          </button>
        </div>
      </div>

      {/* Active audio ring + glow */}
      {isAudioActive && (
        <>
          <div className="absolute inset-0 rounded-2xl ring-2 ring-brand-500 pointer-events-none" />
          <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-500 rounded-full shadow-lg shadow-brand-500/60 animate-pulse pointer-events-none" />
        </>
      )}

      {/* Match label (always visible, bottom) */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2
                      bg-gradient-to-t from-black/70 to-transparent
                      group-hover:opacity-0 transition-opacity duration-200 pointer-events-none">
        <p className="text-white/60 text-[10px] truncate">{channel?.currentMatch}</p>
      </div>
    </div>
  )
}
