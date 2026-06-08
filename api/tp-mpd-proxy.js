// Fetches a Tata Play MPD from the user's PHP proxy and injects a ClearKey
// ContentProtection element so Shaka can select org.w3.clearkey DRM.
// The MPD from get-mpd.php already has cenc:default_KID + Widevine PSSH.
// We keep those and add the ClearKey system ID alongside them.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const rawUrl = req.query.url
  if (!rawUrl) return res.status(400).end('Missing ?url=')

  let targetUrl
  try { targetUrl = decodeURIComponent(rawUrl); new URL(targetUrl) }
  catch { return res.status(400).end('Invalid URL') }

  try {
    const r = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':  'application/dash+xml, */*',
        'Referer': 'https://watch.tataplay.com/',
        'Origin':  'https://watch.tataplay.com',
      },
    })
    if (!r.ok) return res.status(r.status).end('Upstream MPD fetch failed')

    let text = await r.text()

    // Extract the KID injected by get-mpd.php (UUID format: 8-4-4-4-12)
    const kidMatch = text.match(/cenc:default_KID="([0-9a-f-]{36})"/i)
    if (kidMatch) {
      const kid = kidMatch[1]
      // Inject ClearKey ContentProtection immediately before the first existing one
      const ckEntry = [
        `<ContentProtection`,
        ` schemeIdUri="urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e"`,
        ` value="ClearKey1.0">`,
        `<cenc:default_KID>${kid}</cenc:default_KID>`,
        `</ContentProtection>`,
      ].join('')
      text = text.replace('<ContentProtection', ckEntry + '\n        <ContentProtection')
    }

    res.setHeader('Content-Type', 'application/dash+xml')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    return res.status(200).send(text)
  } catch (e) {
    return res.status(502).end('tp-mpd-proxy error: ' + e.message)
  }
}
