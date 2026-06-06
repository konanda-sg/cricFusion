// Vercel serverless function — transparent proxy for FanCode CDN.
// Strips Referer/Origin so the CDN doesn't 403 cross-origin requests.
// Also rewrites absolute CDN URLs inside HLS manifests so every
// subsequent segment fetch also goes through this proxy.

export default async function handler(req, res) {
  const pathArr  = req.query.path
  const segments = Array.isArray(pathArr) ? pathArr : [pathArr].filter(Boolean)
  const urlPath  = segments.join('/')

  // Rebuild any query string, minus Vercel's injected `path` param
  const rawQuery = req.url.split('?')[1] || ''
  const qs = rawQuery
    .split('&')
    .filter((p) => !p.startsWith('path='))
    .join('&')

  const upstream = `https://in-mc-fblive.fancode.com/${urlPath}${qs ? '?' + qs : ''}`

  let resp
  try {
    resp = await fetch(upstream, {
      method:  req.method,
      headers: {
        accept:           req.headers['accept'] || '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
  } catch {
    res.status(502).end('Proxy error')
    return
  }

  const ct = resp.headers.get('content-type') || 'application/octet-stream'
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store')
  res.setHeader('Content-Type', ct)

  if (ct.includes('mpegurl') || urlPath.endsWith('.m3u8')) {
    // Rewrite absolute FanCode CDN URLs in the manifest so HLS.js
    // segment fetches also go through this proxy (same-origin, no 403).
    let text = await resp.text()
    text = text.replace(/https?:\/\/in-mc-fblive\.fancode\.com\//g, '/fc-cdn/')
    res.status(resp.status).send(text)
  } else {
    const buf = await resp.arrayBuffer()
    res.status(resp.status).send(Buffer.from(buf))
  }
}
