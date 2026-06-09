// Widevine license proxy for Tata Play.
// Shaka sends: POST /api/tp-wv-license?id=&sub=&tok= with binary Widevine challenge.
// We decrypt dashWidevineLicenseUrl from content API and forward the challenge to Irdeto.
import crypto from 'crypto'

const UA      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
const AES_KEY = Buffer.from('aesEncryptionKey')

function decryptUrl(encryptedUrl) {
  const clean = encryptedUrl.replace(/#.*$/, '').trim()
  const decoded = Buffer.from(clean, 'base64')
  const decipher = crypto.createDecipheriv('aes-128-ecb', AES_KEY, null)
  decipher.setAutoPadding(true)
  return Buffer.concat([decipher.update(decoded), decipher.final()]).toString()
}

async function getContentData(id, subscriberId, token) {
  const contentApi = `https://tb.tapi.videoready.tv/content-detail/api/partner/cdn/player/details/chotiluli/${id}`
  const r = await fetch(contentApi, {
    headers: { 'Authorization': `Bearer ${token}`, 'subscriberId': subscriberId },
  })
  return r.json()
}

async function getDrmToken(id, subscriberId, token) {
  // Tata Play may have a dedicated DRM token endpoint that returns a signed JWT
  // for Irdeto entitlement validation. Try the most likely path.
  try {
    const r = await fetch(
      `https://tb.tapi.videoready.tv/content-detail/api/partner/cdn/player/drm-token/${id}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'subscriberId': subscriberId } }
    )
    if (r.ok) {
      const d = await r.json()
      const t = d?.data?.token || d?.data?.drmToken || d?.data?.jwt || d?.token
      if (t && t.includes('.')) return t  // JWT has dots
    }
  } catch {}
  return null
}

async function getWvLicenseUrl(id, subscriberId, token) {
  const data = await getContentData(id, subscriberId, token)

  // Tata Play API spells it "Widewine" (their typo for Widevine)
  const wvEnc = data?.data?.dashWidewineLicenseUrl || data?.data?.dashWidevineLicenseUrl
  if (wvEnc) return decryptUrl(wvEnc)

  // Fallback: derive from PlayReady URL (same Irdeto server, only path differs)
  const prEnc = data?.data?.dashPlayreadyLicenseUrl
  if (prEnc) {
    const prUrl = decryptUrl(prEnc)
    return prUrl.replace('/playready/rightsmanager.asmx', '/Widevine/getlicense')
  }

  throw new Error(`No Widevine/PlayReady license URL in API. Keys: ${JSON.stringify(Object.keys(data?.data || {}))}`)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const { id, sub: subscriberId, tok: token } = req.query
  if (!id)           return res.status(400).end('Missing ?id=')
  if (!subscriberId) return res.status(401).end('Missing ?sub=')
  if (!token)        return res.status(401).end('Missing ?tok=')

  const challenge = await new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end',  () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

  if (!challenge.length) return res.status(400).end('Empty Widevine challenge')

  try {
    const [wvUrl, drmToken] = await Promise.all([
      getWvLicenseUrl(id, subscriberId, token),
      getDrmToken(id, subscriberId, token),
    ])

    // Build auth headers — try DRM JWT first, fall back to subscriber auth token
    const authToken = drmToken || token
    console.log('[tp-wv-license] forwarding to:', wvUrl, '| drmToken:', drmToken ? 'yes' : 'no')

    const r = await fetch(wvUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/octet-stream',
        'User-Agent':    UA,
        'Origin':        'https://watch.tataplay.com',
        'Referer':       'https://watch.tataplay.com/',
        'Accept':        '*/*',
        'Authorization': `Bearer ${authToken}`,
        'subscriberId':  subscriberId,
      },
      body: challenge,
    })

    const licenseBuf = Buffer.from(await r.arrayBuffer())

    if (!r.ok) {
      console.error('[tp-wv-license] Irdeto error', r.status, licenseBuf.toString())
      return res.status(r.status).send(licenseBuf)
    }

    res.setHeader('Content-Type', 'application/octet-stream')
    return res.status(200).send(licenseBuf)
  } catch (e) {
    console.error('[tp-wv-license] error:', e.message)
    return res.status(502).end(`tp-wv-license error: ${e.message}`)
  }
}
