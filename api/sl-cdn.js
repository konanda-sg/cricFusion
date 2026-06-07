import { Readable } from 'node:stream'

// Node.js serverless in Mumbai (AWS ap-south-1) — avoids Cloudflare edge IPs
// that Akamai blocks. Edge runtime used Cloudflare; this uses AWS Lambda.
export const config = { regions: ['bom1'] }

function proxyAkamaiUrl(url, hdnea) {
  let out = url
  if (out.startsWith('https://sonydaimenew.akamaized.net/')) {
    out = '/sl-cdn/' + out.slice('https://sonydaimenew.akamaized.net/'.length)
  } else if (out.startsWith('https://sonypartnersdaimenew.akamaized.net/')) {
    out = '/sl-cdn/' + out.slice('https://sonypartnersdaimenew.akamaized.net/'.length)
    out += out.includes('?') ? '&host=p' : '?host=p'
  }
  if (hdnea && !out.includes('hdnea=')) {
    out += out.includes('?') ? `&hdnea=${hdnea}` : `?hdnea=${hdnea}`
  }
  return out
}

function rewriteManifest(text, hdnea) {
  let out = text.replace(/^(?!#|\s*$)(.+)$/gm, (line) => proxyAkamaiUrl(line.trim(), hdnea))
  out = out.replace(/(URI=")([^"]+)(")/g, (_, open, uri, close) =>
    `${open}${proxyAkamaiUrl(uri, hdnea)}${close}`
  )
  return out
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-cache, no-store')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.statusCode = 204
    return res.end()
  }

  const url = new URL(req.url, 'https://x.x')
  const path = url.searchParams.get('path') || ''
  const hdnea = url.searchParams.get('hdnea') || ''
  const akamaiHost = url.searchParams.get('host') === 'p'
    ? 'sonypartnersdaimenew.akamaized.net'
    : 'sonydaimenew.akamaized.net'

  // Preserve raw query string verbatim — URLSearchParams.toString() re-encodes
  // '=' inside hdnea values as '%3D', breaking Akamai's HMAC validation.
  const rawQs = url.search.slice(1).split('&')
    .filter((p) => !p.startsWith('path=') && !p.startsWith('host='))
    .join('&')

  const upstream = `https://${akamaiHost}/${path}${rawQs ? '?' + rawQs : ''}`

  let upstreamResp
  try {
    upstreamResp = await fetch(upstream, {
      headers: {
        accept: req.headers['accept'] || '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        referer: 'https://www.sonyliv.com/',
        origin: 'https://www.sonyliv.com',
      },
    })
  } catch (err) {
    res.statusCode = 502
    return res.end('Proxy error: ' + err.message)
  }

  if (upstreamResp.status === 403) {
    const body = await upstreamResp.text()
    res.statusCode = 403
    res.setHeader('Content-Type', 'text/plain')
    return res.end(`Upstream 403 from ${akamaiHost}\n\n${body}`)
  }

  const ct = upstreamResp.headers.get('content-type') || 'application/octet-stream'
  res.statusCode = upstreamResp.status
  res.setHeader('Content-Type', ct)

  if (ct.includes('mpegurl') || path.endsWith('.m3u8')) {
    const text = rewriteManifest(await upstreamResp.text(), hdnea)
    return res.end(text)
  }

  // Stream binary segments directly without buffering
  if (upstreamResp.body) {
    const nodeStream = Readable.fromWeb(upstreamResp.body)
    nodeStream.on('error', () => { if (!res.writableEnded) res.end() })
    nodeStream.pipe(res)
  } else {
    res.end()
  }
}
