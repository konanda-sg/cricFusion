// ClearKey license server proxy for Tata Play.
// Shaka sends: POST /api/tp-license?id={channelId} with {"kids": [...]}
// We GET the key set from the Cloudflare worker and return it.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const { id } = req.query
  if (!id) return res.status(400).end('Missing ?id=')

  // Read the request body (Shaka sends a ClearKey JWKS POST body: {"kids":[...],"type":"temporary"})
  let body = ''
  if (req.method === 'POST') {
    body = await new Promise((resolve) => {
      const chunks = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    })
  }

  try {
    const r = await fetch(`https://tp.drmlive-01.workers.dev?id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin':  'https://watch.tataplay.com',
        'Referer': 'https://watch.tataplay.com/',
        'Content-Type': 'application/json',
        'Accept':  'application/json',
      },
      body: body || '{}',
    })
    if (!r.ok) return res.status(r.status).end('License worker error')
    const json = await r.json()
    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json(json)
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
}
