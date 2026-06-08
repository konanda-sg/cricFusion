const GROUP_CATEGORY = {
  sports:        'cricket',
  cricket:       'cricket',
  football:      'football',
  soccer:        'football',
  tennis:        'tennis',
  basketball:    'basketball',
  'formula 1':   'formula1',
  f1:            'formula1',
  motorsport:    'formula1',
  boxing:        'boxing',
  wrestling:     'boxing',
  kabaddi:       'cricket',
  badminton:     'cricket',
  hockey:        'cricket',
}

function groupToCategory(group) {
  const lower = (group || '').toLowerCase()
  for (const [key, val] of Object.entries(GROUP_CATEGORY)) {
    if (lower.includes(key)) return val
  }
  return 'multi'
}

// Parse an M3U text into raw channel objects.
// Handles #EXTINF, #KODIPROP license key/type, and the stream URL line.
// Strips IPTV pipe-header suffixes (|key=val) from URLs.
export function parseM3u(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const channels = []
  let meta = null

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const logo   = line.match(/tvg-logo="([^"]*)"/)?.[1] || ''
      const group  = line.match(/group-title="([^"]*)"/)?.[1] || 'General'
      const tvgId  = line.match(/tvg-id="([^"]*)"/)?.[1] || ''
      const name   = line.match(/,(.+)$/)?.[1]?.trim() || 'Unknown'
      meta = { logo, group, tvgId, name, licenseServer: null }
    } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=') && meta) {
      meta.licenseServer = line.replace('#KODIPROP:inputstream.adaptive.license_key=', '').trim()
    } else if (!line.startsWith('#') && meta) {
      const url = line.split('|')[0].trim()
      if (url) {
        channels.push({ ...meta, url })
        meta = null
      }
    }
  }

  return channels
}

// For Tata Play channels (license URL via tp.drmlive-01.workers.dev):
// - Route the MPD URL through /api/tp-mpd-proxy (adds ClearKey system ID)
// - Route the license URL through /api/tp-license (ClearKey JSON proxy)
// Headers are handled server-side; no reqHeaders needed in browser.
function resolveTpUrls(ch) {
  const ls = ch.licenseServer || ''
  if (!ls.includes('tp.drmlive-01.workers.dev')) {
    return { url: ch.url, licenseServer: ls || null, reqHeaders: null }
  }
  let tpId = null
  try { tpId = new URL(ls).searchParams.get('id') } catch {}

  const url = `/api/tp-mpd-proxy?url=${encodeURIComponent(ch.url)}`
  const licenseServer = tpId ? `/api/tp-license?id=${encodeURIComponent(tpId)}` : ls
  return { url, licenseServer, reqHeaders: null }
}

// Map a parsed M3U channel into the CricFusion channel schema.
export function mapM3uChannel(ch, id) {
  const isHd = /\bHD\b/i.test(ch.name)
  const { url, licenseServer, reqHeaders } = resolveTpUrls(ch)
  return {
    id,
    key:          `tp_${ch.tvgId || id}`,
    name:         ch.name,
    category:     groupToCategory(ch.group),
    currentMatch: ch.name,
    thumbnail:    ch.logo || null,
    logo:         ch.name.replace(/\s+HD\s*$/i, '').slice(0, 4).toUpperCase(),
    isLive:       true,
    viewers:      '—',
    badge:        isHd ? 'HD' : 'SD',
    language:     'Hindi',
    description:  `${ch.name} — Tata Play`,
    score:        null,
    url,
    clearKey:     null,
    licenseServer,
    reqHeaders,
    quality: ['Auto'],
  }
}
