// Vercel Edge Function — Germany-pinned geo proxy.
// Some channels (e.g. Sportdigital Fussball on t-online/Akamai) are geo-locked
// to Germany. This proxy is pinned to the Frankfurt edge (fra1) so the outgoing
// request originates from Germany, letting these streams play without the user
// needing a VPN — and, crucially, so a Chromecast (which fetches the stream
// itself, not through the phone's VPN) can also reach them.
//
// Path-based, like fc-cdn: the channel URL becomes
//   /cf-geo/<host>/<path>/index.mpd
// The DASH manifest is served from this same proxied path, so Shaka resolves
// every relative segment request back through here automatically. Absolute URLs
// inside the manifest are rewritten to stay on the proxy too.
//
// ClearKey decryption is unaffected — it's done client-side by Shaka using the
// key in the channel data; this proxy only relays bytes from a German IP.

export const config = { runtime: 'edge' }
export const preferredRegion = 'fra1'   // Frankfurt, Germany

// Only hosts we explicitly allow to be proxied (avoid an open relay).
const ALLOWED_HOSTS = [
  'svc45.main.sl.t-online.de',
  'svc44.main.sl.t-online.de',
  'svc46.main.sl.t-online.de',
]

// Only our own front-ends may call this.
const ALLOWED_REFERERS = [
  'https://cricfusion.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

export default async function handler(req) {
  const url = new URL(req.url)
  const path = url.searchParams.get('path') || ''

  // Referer-gate browser calls, but allow empty referers: a Chromecast fetches
  // segments itself and sends no referer. The ALLOWED_HOSTS whitelist below is
  // the real guard against this being an open relay.
  const referer = req.headers.get('referer') || req.headers.get('origin') || ''
  if (referer && !ALLOWED_REFERERS.some((o) => referer.startsWith(o))) {
    return new Response('Forbidden', { status: 403 })
  }

  // path = "<host>/<rest...>". Reconstruct the upstream URL.
  const slash = path.indexOf('/')
  const host = slash === -1 ? path : path.slice(0, slash)
  if (!ALLOWED_HOSTS.includes(host)) {
    return new Response('Host not allowed', { status: 400 })
  }

  // Preserve any original query string (tokens etc.), minus our 'path' param.
  const params = new URLSearchParams(url.search)
  params.delete('path')
  const qs = params.toString()
  const upstream = `https://${path}${qs ? '?' + qs : ''}`

  let resp
  try {
    resp = await fetch(upstream, {
      method: req.method,
      headers: {
        accept: req.headers.get('accept') || '*/*',
        'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
      },
    })
  } catch (e) {
    return new Response('Geo proxy fetch error: ' + e.message, { status: 502 })
  }

  if (!resp.ok) {
    return new Response(`Upstream ${resp.status}`, { status: resp.status })
  }

  const ct = resp.headers.get('content-type') || 'application/octet-stream'
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache, no-store',
    'Content-Type': ct,
  }

  // Rewrite absolute upstream URLs inside the DASH manifest so segment fetches
  // also route through this proxy. Relative URLs need no rewrite — they resolve
  // against this same /cf-geo/ path.
  if (ct.includes('dash+xml') || path.endsWith('.mpd')) {
    let text = await resp.text()
    for (const h of ALLOWED_HOSTS) {
      text = text.split(`https://${h}/`).join(`/cf-geo/${h}/`)
    }
    return new Response(text, { status: 200, headers })
  }

  // Stream binary segments straight through.
  return new Response(resp.body, { status: 200, headers })
}
