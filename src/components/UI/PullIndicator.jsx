import { Zap } from 'lucide-react'

export default function PullIndicator({ pullY, refreshing, threshold }) {
  const progress  = Math.min(pullY / threshold, 1)
  const triggered = pullY >= threshold
  const opacity   = Math.min(pullY / 28, 1)
  const scale     = 0.72 + progress * 0.28

  // Runner slides right as you pull further
  const runnerX   = refreshing ? 0 : (progress - 0.5) * 24

  const accentColor = triggered || refreshing ? '#c8ff00' : 'rgba(255,255,255,0.28)'
  const textColor   = triggered || refreshing ? '#c8ff00' : 'rgba(255,255,255,0.28)'

  const label = refreshing ? 'Refreshing…' : triggered ? "Release! Let's go" : 'Pull down to refresh'

  return (
    <div style={{
      height: refreshing ? 96 : Math.min(pullY * 0.82, 96),
      transition: pullY > 0 ? 'none' : 'height 0.32s cubic-bezier(0.34,1.56,0.64,1)',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        opacity,
        transform: `scale(${scale})`,
        transition: pullY > 0 ? 'opacity 0.1s ease' : 'all 0.3s ease',
      }}>

        {/* Icons row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Left zap */}
          <Zap
            size={20}
            fill={accentColor}
            style={{
              color: accentColor,
              filter: (triggered || refreshing) ? `drop-shadow(0 0 6px #c8ff00)` : 'none',
              animation: refreshing ? 'zap-flash 0.45s ease infinite alternate' : 'none',
              transition: 'color 0.2s ease, filter 0.2s ease',
            }}
          />

          {/* Running boy */}
          <span
            style={{
              fontSize: 28,
              display: 'inline-block',
              transform: `translateX(${runnerX}px)`,
              transition: pullY > 0 ? 'transform 0.05s linear' : 'transform 0.3s ease',
              animation: refreshing ? 'runner-stride 0.38s ease-in-out infinite alternate' : 'none',
              filter: `drop-shadow(0 0 ${triggered || refreshing ? 8 : 0}px rgba(200,255,0,0.6))`,
            }}
          >
            🏃‍♂️
          </span>

          {/* Right zap */}
          <Zap
            size={20}
            fill={accentColor}
            style={{
              color: accentColor,
              filter: (triggered || refreshing) ? `drop-shadow(0 0 6px #c8ff00)` : 'none',
              animation: refreshing ? 'zap-flash 0.45s ease 0.22s infinite alternate' : 'none',
              transition: 'color 0.2s ease, filter 0.2s ease',
            }}
          />
        </div>

        {/* Progress track */}
        <div style={{
          width: 72, height: 2.5,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: triggered ? '#c8ff00' : 'rgba(255,255,255,0.3)',
            borderRadius: 2,
            boxShadow: triggered ? '0 0 8px #c8ff00' : 'none',
            transition: 'background 0.2s ease, box-shadow 0.2s ease',
            animation: refreshing ? 'progress-pulse 0.6s ease infinite alternate' : 'none',
          }} />
        </div>

        {/* Label */}
        <span style={{
          fontSize: 10, fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: textColor,
          transition: 'color 0.2s ease',
        }}>
          {label}
        </span>

      </div>
    </div>
  )
}
