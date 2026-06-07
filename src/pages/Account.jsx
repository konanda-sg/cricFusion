import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, RefreshCw, Tv2, Bell, BellOff, Shield, Info,
  ChevronRight, LogOut, Heart, X, Check, Zap,
} from 'lucide-react'
import { useStore } from '../store/useStore'

const APP_VERSION = '1.0.0'
const QUALITY_OPTIONS = ['Auto', '1080p', '720p', '480p', '360p']

// ── Reusable toggle switch ────────────────────────────────────────────────────
function Toggle({ checked }) {
  return (
    <div className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${checked ? 'bg-brand-500' : 'bg-white/20'}`}>
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      />
    </div>
  )
}

// ── Settings row ──────────────────────────────────────────────────────────────
function Row({ icon: Icon, label, value, onClick, accent, toggle, checked }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.04] transition-colors"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        accent === 'lime'   ? 'bg-brand-500/15' :
        accent === 'red'    ? 'bg-red-500/15' :
        accent === 'blue'   ? 'bg-blue-500/15' :
        accent === 'purple' ? 'bg-purple-500/15' :
        'bg-white/[0.06]'
      }`}>
        <Icon size={18} className={
          accent === 'lime'   ? 'text-brand-500' :
          accent === 'red'    ? 'text-red-400' :
          accent === 'blue'   ? 'text-blue-400' :
          accent === 'purple' ? 'text-purple-400' :
          'text-white/50'
        } />
      </div>
      <span className="flex-1 text-white text-sm font-medium text-left">{label}</span>
      {toggle
        ? <Toggle checked={checked} />
        : value !== undefined
          ? <span className="text-white/40 text-sm">{value}</span>
          : <ChevronRight size={16} className="text-white/25 flex-shrink-0" />
      }
    </motion.button>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="px-4 pb-1.5 text-white/30 text-[11px] font-semibold uppercase tracking-widest">{title}</p>
      <div className="bg-dark-800 rounded-2xl overflow-hidden border border-white/[0.06] mx-4">
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-white/[0.05] mx-4" />
}

// ── Bottom sheet ──────────────────────────────────────────────────────────────
function BottomSheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 bg-dark-800 rounded-t-3xl z-50 border-t border-white/[0.06]"
            style={{ maxHeight: '82vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <h2 className="text-white font-bold text-base">{title}</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center"
              >
                <X size={15} className="text-white/60" />
              </motion.button>
            </div>
            <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(82vh - 64px)' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Privacy section row ───────────────────────────────────────────────────────
function PrivacyBlock({ title, body }) {
  return (
    <div className="py-3 border-b border-white/[0.05] last:border-0">
      <p className="text-white/70 text-sm font-semibold mb-1">{title}</p>
      <p className="text-white/40 text-[13px] leading-relaxed">{body}</p>
    </div>
  )
}

// ── Version info row ──────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white/70 text-sm font-medium">{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Account() {
  const {
    darkMode, toggleDarkMode,
    refreshChannels, channelsLoading, channels,
    notificationsEnabled, toggleNotifications,
    preferredQuality, setPreferredQuality,
  } = useStore()

  const [showQuality, setShowQuality]   = useState(false)
  const [showPrivacy, setShowPrivacy]   = useState(false)
  const [showVersion, setShowVersion]   = useState(false)
  const [notifBlocked, setNotifBlocked] = useState(false)

  const liveCount = channels.filter((c) => c.isLive).length

  const handleToggleNotifications = async () => {
    await toggleNotifications()
    if ('Notification' in window && Notification.permission === 'denied') {
      setNotifBlocked(true)
    } else {
      setNotifBlocked(false)
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-dark-900 pb-safe no-scrollbar">

      {/* Profile card */}
      <div className="px-4 pt-6 pb-5">
        <div className="bg-dark-800 rounded-2xl border border-white/[0.06] p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg flex-shrink-0">
            <span className="text-black font-black text-xl">CF</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">CricFusion</p>
            <p className="text-white/40 text-sm mt-0.5">Guest viewer</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
              <span className="text-brand-500 text-xs font-semibold">{liveCount} channels live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <Section title="Preferences">
        <Row
          icon={darkMode ? Moon : Sun}
          label="Dark Mode"
          toggle
          checked={darkMode}
          onClick={toggleDarkMode}
          accent="lime"
        />
        <Divider />
        <Row
          icon={notificationsEnabled ? Bell : BellOff}
          label="Notifications"
          toggle
          checked={notificationsEnabled}
          onClick={handleToggleNotifications}
          accent="blue"
        />
        {notifBlocked && (
          <p className="px-4 pb-3 text-yellow-400/70 text-[11px] leading-relaxed">
            Notifications are blocked by your browser. Enable them in browser settings and try again.
          </p>
        )}
      </Section>

      {/* Channels */}
      <Section title="Channels">
        <Row
          icon={RefreshCw}
          label="Refresh Streams"
          value={channelsLoading ? 'Loading…' : `${channels.length} loaded`}
          onClick={refreshChannels}
          accent="lime"
        />
        <Divider />
        <Row
          icon={Tv2}
          label="Stream Quality"
          value={preferredQuality}
          onClick={() => setShowQuality(true)}
          accent="purple"
        />
      </Section>

      {/* About */}
      <Section title="About">
        <Row
          icon={Shield}
          label="Privacy"
          onClick={() => setShowPrivacy(true)}
          accent="blue"
        />
        <Divider />
        <Row
          icon={Info}
          label="Version"
          value={APP_VERSION}
          onClick={() => setShowVersion(true)}
        />
      </Section>

      {/* Sign out placeholder */}
      <div className="mx-4 mb-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-colors"
          onClick={() => {}}
        >
          <LogOut size={16} />
          Sign Out
        </motion.button>
      </div>

      <div className="flex items-center justify-center gap-1 mb-6 mt-3">
        <Heart size={9} className="text-red-500 fill-red-500" />
        <span className="text-white/20 text-[10px] font-medium tracking-wide">developed by</span>
        <span className="text-[10px] font-bold tracking-wide" style={{ color: 'rgba(200,255,0,0.5)' }}>Krishi</span>
      </div>

      {/* ── Stream Quality Sheet ── */}
      <BottomSheet open={showQuality} onClose={() => setShowQuality(false)} title="Stream Quality">
        <div className="py-2">
          {QUALITY_OPTIONS.map((q) => (
            <motion.button
              key={q}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setPreferredQuality(q); setShowQuality(false) }}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                {q === 'Auto' && <Zap size={14} className="text-brand-400" />}
                <span className="text-white text-sm font-medium">{q}</span>
                {q === 'Auto' && <span className="text-white/30 text-[11px]">Recommended</span>}
              </div>
              {preferredQuality === q && <Check size={16} className="text-brand-500" />}
            </motion.button>
          ))}
          <p className="px-5 pt-2 pb-4 text-white/25 text-[11px] leading-relaxed border-t border-white/[0.05] mt-1">
            Applied when opening a stream. The player may adjust based on network conditions.
          </p>
        </div>
      </BottomSheet>

      {/* ── Privacy Sheet ── */}
      <BottomSheet open={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy">
        <div className="px-5 py-2 pb-6">
          <PrivacyBlock
            title="Data Collection"
            body="CricFusion does not collect, store, or transmit any personal data. No account or registration is required."
          />
          <PrivacyBlock
            title="Stream Sources"
            body="Video streams are sourced from third-party providers. CricFusion aggregates publicly accessible stream URLs and acts only as a player interface."
          />
          <PrivacyBlock
            title="Local Storage"
            body="Preferences such as theme, quality, and notifications are saved only to your device's local storage. This data never leaves your device."
          />
          <PrivacyBlock
            title="Analytics & Tracking"
            body="No analytics, advertising trackers, crash reporters, or telemetry of any kind are used or embedded."
          />
          <PrivacyBlock
            title="Service Worker"
            body="A service worker proxies stream requests to protect source URLs. No request data is logged, stored, or shared."
          />
        </div>
      </BottomSheet>

      {/* ── Version Sheet ── */}
      <BottomSheet open={showVersion} onClose={() => setShowVersion(false)} title="About CricFusion">
        <div className="px-5 py-4 pb-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-black text-lg">CF</span>
            </div>
            <div>
              <p className="text-white font-bold text-base">CricFusion</p>
              <p className="text-white/40 text-sm">Version {APP_VERSION}</p>
            </div>
          </div>

          <div className="bg-dark-900 rounded-xl border border-white/[0.06] px-4 mb-4">
            <InfoRow label="Version"   value={APP_VERSION} />
            <InfoRow label="Platform"  value="Web App (PWA)" />
            <InfoRow label="Player"    value="HLS.js + Shaka" />
            <InfoRow label="Framework" value="React 19 + Vite" />
          </div>

          <div className="p-4 bg-brand-500/[0.07] border border-brand-500/20 rounded-xl">
            <p className="text-brand-400 text-xs font-bold uppercase tracking-wider mb-2">
              What's New in v{APP_VERSION}
            </p>
            <ul className="text-white/40 text-[12px] space-y-1.5">
              {[
                'Multi-source stream aggregation (jtvv, FanCode, Sony LIV)',
                'DASH + HLS dual player with DRM support',
                'Live captions via SpeechRecognition API (beta)',
                'Swipe gestures for brightness & volume',
                'Pinch-to-zoom & picture enhancement',
                'PWA install support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-brand-500 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </BottomSheet>

    </main>
  )
}
