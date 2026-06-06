import { create } from 'zustand'
import {
  CHANNEL_ORDER, STATIC_CHANNELS, mapApiChannel,
  DYNAMIC_CHANNEL_IDS, mapDynamicChannel,
} from '../data/channels'
import { isDevToolsOpen } from '../utils/devtools-guard'

const PROXY         = '/cf-data'      // SW → jtvv.pages.dev/channels.json
const DYNAMIC_PROXY = '/cf-dynamic'   // SW → newwwwapiiiiii.vercel.app/main?id=...

// SW base64-encodes responses; decode back to JSON string
function decode(text, swActive) {
  try {
    const raw = swActive ? decodeURIComponent(escape(atob(text.trim()))) : text
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const useStore = create((set, get) => ({
  // ── Theme ──────────────────────────────────────────────────────────────
  darkMode: true,
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  // ── Channels (loaded from API) ─────────────────────────────────────────
  channels: STATIC_CHANNELS,         // start with static; API channels prepended on load
  channelsLoading: false,
  channelsError: null,
  lastFetched: null,

  loadChannels: async () => {
    const ownerMode = localStorage.getItem('cf_dev') === '1'
    if (!ownerMode && isDevToolsOpen()) return

    const { channelsLoading, lastFetched } = get()
    if (channelsLoading) return
    if (lastFetched && Date.now() - lastFetched < 5 * 60 * 1000) return

    set({ channelsLoading: true, channelsError: null })

    // SW controller may be null on first load even after serviceWorker.ready
    // (clients.claim() propagates async). Fall back to direct URLs so channels
    // always load; SW proxy kicks in on second+ page load.
    const swActive = !!(navigator.serviceWorker?.controller)
    const batchUrl = swActive ? PROXY : 'https://jtvv.pages.dev/channels.json'
    const dynUrl   = (id) => swActive
      ? `${DYNAMIC_PROXY}?id=${id}`
      : `https://newwwwapiiiiii.vercel.app/main?id=${id}`

    try {
      // Fire both APIs in parallel — SW proxies both so real URLs stay hidden
      const [batchResult, ...dynamicResults] = await Promise.allSettled([
        fetch(batchUrl).then((r) => r.text()),
        ...DYNAMIC_CHANNEL_IDS.map((id) => fetch(dynUrl(id)).then((r) => r.text())),
      ])

      // ── Batch channels (jtvv) ──────────────────────────────────────────
      let apiChannels = []
      if (batchResult.status === 'fulfilled') {
        const json = decode(batchResult.value, swActive)
        if (json) {
          const ordered = [
            ...CHANNEL_ORDER,
            ...Object.keys(json).filter((k) => !CHANNEL_ORDER.includes(k)),
          ]
          apiChannels = ordered
            .filter((key) => json[key])
            .map((key, i) => mapApiChannel(key, json[key], i + 1))
        }
      }

      // ── Per-channel dynamic channels ───────────────────────────────────
      const dynamicChannels = dynamicResults
        .map((result, i) => {
          if (result.status !== 'fulfilled') return null
          const data = decode(result.value, swActive)
          if (!data || !data.url) return null
          return mapDynamicChannel(data, 200 + i + 1)
        })
        .filter(Boolean)

      set({
        channels: [...apiChannels, ...dynamicChannels, ...STATIC_CHANNELS],
        channelsLoading: false,
        lastFetched: Date.now(),
      })
    } catch (err) {
      console.error('Failed to load channels:', err)
      set({ channelsLoading: false, channelsError: err.message })
    }
  },

  refreshChannels: () => {
    set({ lastFetched: null })
    get().loadChannels()
  },

  // ── Navigation state ───────────────────────────────────────────────────
  currentChannel: null,
  setCurrentChannel: (ch) => set({ currentChannel: ch }),

  activeCategory: 'all',
  setActiveCategory: (cat) => set({ activeCategory: cat }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}))
