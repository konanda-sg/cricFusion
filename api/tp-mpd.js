// Full port of get-mpd.php:
// 1. Calls Tata Play content API with subscriber auth to get encrypted MPD URL
// 2. Decrypts URL via AES-128-ECB
// 3. Follows redirect to capture hdntl CDN auth cookie
// 4. Fetches the MPD with tataplay.com headers
// 5. Extracts Widevine PSSH → calls tp.secure-kid.workers.dev for KID
// 6. Rewrites manifest: injects cenc:default_KID, PSSH blobs, ClearKey system ID
import crypto from 'crypto'

const UA    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
const WATCH = 'https://watch.tataplay.com'
const AES_KEY = Buffer.from('aesEncryptionKey') // 16 bytes = AES-128

function decryptUrl(encryptedUrl) {
  const clean = encryptedUrl.replace(/#.*$/, '').trim()
  const decoded = Buffer.from(clean, 'base64')
  const decipher = crypto.createDecipheriv('aes-128-ecb', AES_KEY, null)
  decipher.setAutoPadding(true)
  return Buffer.concat([decipher.update(decoded), decipher.final()]).toString()
}

async function resolveMpdUrl(id, subscriberId, token) {
  const contentApi = `https://tb.tapi.videoready.tv/content-detail/api/partner/cdn/player/details/chotiluli/${id}`
  const r = await fetch(contentApi, {
    headers: { 'Authorization': `Bearer ${token}`, 'subscriberId': subscriberId },
  })
  const data = await r.json()
  if (!data.data?.dashPlayreadyPlayUrl) throw new Error('dashPlayreadyPlayUrl not found')

  let url = decryptUrl(data.data.dashPlayreadyPlayUrl)
  url = url.replace('bpaita', 'bpaicatchupta').replace('manifest', 'Manifest')

  if (!url.includes('bpaicatchupta')) return url

  // Follow redirect (don't auto-follow) to capture hdntl CDN token from Set-Cookie
  const redir = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': UA, 'Accept': '*/*', 'Connection': 'close' },
  })

  const setCookie = redir.headers.get('set-cookie') || ''
  const hdntlMatch = setCookie.match(/hdntl=([^;]+)/)
  if (hdntlMatch) {
    return `${url.split('?')[0]}?hdntl=${hdntlMatch[1]}`
  }

  const hdntlHeader = redir.headers.get('hdntl')
  if (hdntlHeader) {
    return `${url.split('?')[0]}?hdntl=${hdntlHeader}`
  }

  const location = redir.headers.get('location')
  if (location) return location.split('&')[0]

  return url
}

async function extractPssh(mpdText) {
  const wvMatch = mpdText.match(/schemeIdUri="[^"]*edef8ba9[^"]*"[^>]*>[\s\S]*?<cenc:pssh[^>]*>([\s\S]*?)<\/cenc:pssh>/i)
  const wvPssh = wvMatch?.[1]?.trim() || null
  const prMatch = mpdText.match(/schemeIdUri="[^"]*9a04f079[^"]*"[^>]*>[\s\S]*?<cenc:pssh[^>]*>([\s\S]*?)<\/cenc:pssh>/i)
  const prPssh = prMatch?.[1]?.trim() || null

  // Primary: KID already present in the MPD (mp4protection cenc:default_KID)
  const directKid = mpdText.match(/cenc:default_KID="([0-9a-f-]{36})"/i)?.[1]
  if (directKid) return { wvPssh, prPssh, kid: directKid }

  if (!wvPssh) return { wvPssh, prPssh, kid: null }

  // Fallback: derive KID from Widevine PSSH via secure-kid worker
  try {
    const psshHex = Buffer.from(wvPssh, 'base64').toString('hex')
    const kidResp = await fetch('https://tp.secure-kid.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pssh: psshHex }),
    })
    const kidData = await kidResp.json()
    const h = kidData.encryptedKID
    if (!h) return { wvPssh, prPssh, kid: null }
    const kid = [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20)].join('-')
    return { wvPssh, prPssh, kid }
  } catch {
    return { wvPssh, prPssh, kid: null }
  }
}

function rewriteMpd(text, baseUrl, pssh) {
  // Rewrite relative dash/ segment paths to absolute
  let out = text.replace(/\bdash\//g, `${baseUrl}/dash/`)

  if (!pssh) return out

  // Remove Widevine (edef8ba9) and PlayReady (9a04f079) ContentProtection elements.
  // Shaka prefers Widevine when present and throws NO_LICENSE_SERVER_GIVEN (6012)
  // since we only support ClearKey. Removing them forces Shaka to use our ClearKey entry.
  out = out.replace(/<ContentProtection[^>]*(?:edef8ba9|9a04f079)[^>]*(?:\/>|>[\s\S]*?<\/ContentProtection>)/gi, '')

  // Only inject cenc:default_KID into mp4protection if not already present
  if (pssh.kid && !text.includes('cenc:default_KID')) {
    out = out.replace('mp4protection:2011"', `mp4protection:2011" cenc:default_KID="${pssh.kid}"`)
  }

  // Inject ClearKey ContentProtection before the first remaining ContentProtection
  if (pssh.kid) {
    const ck = `<ContentProtection schemeIdUri="urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e" value="ClearKey1.0"><cenc:default_KID>${pssh.kid}</cenc:default_KID></ContentProtection>`
    out = out.replace('<ContentProtection', `${ck}\n        <ContentProtection`)
  }

  return out
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const { id, sub: subscriberId, tok: token } = req.query
  if (!id)             return res.status(400).end('Missing ?id=')
  if (!subscriberId)   return res.status(401).end('Missing ?sub=')
  if (!token)          return res.status(401).end('Missing ?tok=')

  try {
    const mpdUrl = await resolveMpdUrl(id, subscriberId, token)

    const mpdResp = await fetch(mpdUrl, {
      headers: { 'User-Agent': UA, 'Referer': WATCH + '/', 'Origin': WATCH },
    })
    if (!mpdResp.ok) return res.status(mpdResp.status).end('MPD fetch failed')

    const mpdText = await mpdResp.text()
    const baseUrl = mpdUrl.substring(0, mpdUrl.lastIndexOf('/'))
    const pssh = await extractPssh(mpdText)
    const processed = rewriteMpd(mpdText, baseUrl, pssh)

    res.setHeader('Content-Type', 'application/dash+xml')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    return res.status(200).send(processed)
  } catch (e) {
    return res.status(500).end(`tp-mpd error: ${e.message}`)
  }
}
