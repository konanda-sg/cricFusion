// Vercel serverless — proxies any M3U playlist URL to avoid CORS.
// Used by CricFusion to load user-supplied custom playlists (e.g. Tata Play).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.statusCode = 204
    return res.end()
  }

  const rawUrl = req.query.url
  if (!rawUrl) return res.status(400).end('Missing ?url= parameter')

  let targetUrl
  try {
    targetUrl = decodeURIComponent(rawUrl)
    new URL(targetUrl) // validate
  } catch {
    return res.status(400).end('Invalid URL')
  }

  let resp
  try {
    resp = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'TiviMate/4.6.0 (Android)',
        'Accept': '*/*',
      },
    })
  } catch (err) {
    return res.status(502).end('Upstream fetch failed: ' + err.message)
  }

  const text = await resp.text()
  res.setHeader('Content-Type', resp.headers.get('content-type') || 'audio/x-mpegurl')
  res.status(resp.status).send(text)
}
