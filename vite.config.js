import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pathToFileURL } from 'url'
import nodePath from 'path'

const AKAMAI = 'sonydaimenew.akamaized.net'

const SL_PARTNERS = 'sonypartnersdaimenew.akamaized.net'

function slProxyUrl(url, hdnea) {
  let out = url
  if (out.startsWith(`https://${AKAMAI}/`)) {
    out = '/sl-cdn/' + out.slice(`https://${AKAMAI}/`.length)
  } else if (out.startsWith(`https://${SL_PARTNERS}/`)) {
    out = '/sl-cdn/' + out.slice(`https://${SL_PARTNERS}/`.length)
    out += out.includes('?') ? '&host=p' : '?host=p'
  }
  if (hdnea && !out.includes('hdnea=')) {
    out += out.includes('?') ? `&hdnea=${hdnea}` : `?hdnea=${hdnea}`
  }
  return out
}

function rewriteSlM3u8(text, hdnea) {
  let out = text.replace(/^(?!#|\s*$)(.+)$/gm, (line) => slProxyUrl(line.trim(), hdnea))
  out = out.replace(/(URI=")([^"]+)(")/g, (_, a, uri, b) => `${a}${slProxyUrl(uri, hdnea)}${b}`)
  return out
}

// Dev-time proxy for /sl-cdn that mirrors the Vercel Edge Function:
// fetches from Akamai, rewrites manifest URLs, adds CORS headers.
function sonyLivDevProxy() {
  return {
    name: 'sl-cdn-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/sl-cdn/')) return next()

        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', '*')
          res.statusCode = 204
          return res.end()
        }

        const slicedUrl = req.url.slice('/sl-cdn'.length)
        const qIdx = slicedUrl.indexOf('?')
        const slPath = qIdx >= 0 ? slicedUrl.slice(0, qIdx) : slicedUrl
        const rawQuery = qIdx >= 0 ? slicedUrl.slice(qIdx + 1) : ''
        const parts = rawQuery.split('&')
        const isPartners = parts.some((p) => p === 'host=p')
        const akamaiHost = isPartners ? SL_PARTNERS : AKAMAI
        const cleanQuery = parts.filter((p) => p !== 'host=p').join('&')
        const upstream = `https://${akamaiHost}${slPath}${cleanQuery ? '?' + cleanQuery : ''}`

        let hdnea = ''
        try { hdnea = new URL(upstream).searchParams.get('hdnea') || '' } catch {}

        try {
          const r = await fetch(upstream, {
            headers: {
              'accept': '*/*',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'dnt': '1',
              'origin': 'https://www.sonyliv.com',
              'referer': 'https://www.sonyliv.com/',
              'priority': 'u=1, i',
              'sec-ch-ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
              'sec-ch-ua-mobile': '?0',
              'sec-ch-ua-platform': '"Windows"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'cross-site',
              'sec-fetch-storage-access': 'active',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
              ...(req.headers['range'] && { 'range': req.headers['range'] }),
            },
          })

          const ct = r.headers.get('content-type') || 'application/octet-stream'
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Cache-Control', 'no-cache, no-store')
          res.setHeader('Content-Type', ct)
          res.statusCode = r.status

          if (ct.includes('mpegurl') || /\.m3u8/.test(slPath)) {
            const text = rewriteSlM3u8(await r.text(), hdnea)
            return res.end(text)
          }

          const buf = Buffer.from(await r.arrayBuffer())
          return res.end(buf)
        } catch (err) {
          console.error('[sl-cdn-dev-proxy]', err.message)
          res.statusCode = 502
          return res.end('sl-cdn proxy error')
        }
      })
    },
  }
}

// Dev-time proxies for Tata Play OTP login + channel/MPD APIs
// These forward requests to the same external APIs the Vercel functions call.
function tpApiDevProxy() {
  return {
    name: 'tp-api-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // /api/tp-otp  /api/tp-login  /api/tp-channels  /api/tp-mpd
        if (!url.startsWith('/api/tp-otp') && !url.startsWith('/api/tp-login') &&
            !url.startsWith('/api/tp-channels') && !url.startsWith('/api/tp-mpd?')) return next()

        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.statusCode = 204; return res.end() }

        // Collect body for POST requests
        let body = {}
        if (req.method === 'POST') {
          const raw = await new Promise((resolve) => {
            const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks).toString()))
          })
          try { body = JSON.parse(raw) } catch {}
        }
        const qs = new URL(url, 'http://localhost')

        try {
          // Use absolute file:// URL so import() resolves correctly even when
          // vite.config.js is compiled to a temp directory by esbuild.
          const handlerName = url.split('?')[0].replace('/api/', '')
          const handlerUrl = pathToFileURL(nodePath.join(process.cwd(), 'api', handlerName + '.js')).href
          const mod = await import(handlerUrl)
          const fakeReq = { method: req.method, query: Object.fromEntries(qs.searchParams), body, headers: req.headers }
          const fakeRes = {
            _status: 200, _headers: {}, _body: null,
            status(c) { this._status = c; return this },
            end(b) { res.setHeader('Content-Type', this._headers['Content-Type'] || 'text/plain'); res.statusCode = this._status; res.end(b) },
            send(b) { res.setHeader('Content-Type', this._headers['Content-Type'] || 'text/plain'); res.statusCode = this._status; res.end(b) },
            json(b) { res.setHeader('Content-Type', 'application/json'); res.statusCode = this._status; res.end(JSON.stringify(b)) },
            setHeader(k, v) { this._headers[k] = v; res.setHeader(k, v) },
          }
          await mod.default(fakeReq, fakeRes)
        } catch (e) {
          console.error('[tp-api-dev-proxy]', e)
          if (!res.headersSent) { res.statusCode = 500; res.end('Dev proxy error: ' + e.message) }
        }
      })
    },
  }
}

// Dev-time proxy for /api/tp-license?id=... — ClearKey license server
function tpLicenseDevProxy() {
  return {
    name: 'tp-license-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/tp-license')) return next()
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', '*')
        if (req.method === 'OPTIONS') return res.end()
        const id = new URL(req.url, 'http://localhost').searchParams.get('id')
        if (!id) { res.statusCode = 400; return res.end('Missing id') }
        try {
          const r = await fetch(`https://tp.drmlive-01.workers.dev?id=${encodeURIComponent(id)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://watch.tataplay.com', 'Referer': 'https://watch.tataplay.com/' },
          })
          const json = await r.json()
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify(json))
        } catch (e) { res.statusCode = 502; return res.end('tp-license error') }
      })
    },
  }
}

// Dev-time proxy for /api/tp-mpd-proxy?url=... — fetches MPD + injects ClearKey entry
function tpMpdProxyDev() {
  return {
    name: 'tp-mpd-proxy-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/tp-mpd-proxy')) return next()
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') return res.end()
        const rawUrl = new URL(req.url, 'http://localhost').searchParams.get('url')
        if (!rawUrl) { res.statusCode = 400; return res.end('Missing url') }
        let targetUrl
        try { targetUrl = decodeURIComponent(rawUrl); new URL(targetUrl) } catch { res.statusCode = 400; return res.end('Invalid URL') }
        try {
          const r = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Referer': 'https://watch.tataplay.com/', 'Origin': 'https://watch.tataplay.com' },
          })
          let text = await r.text()
          const kidMatch = text.match(/cenc:default_KID="([0-9a-f-]{36})"/i)
          if (kidMatch) {
            const kid = kidMatch[1]
            const ckEntry = `<ContentProtection schemeIdUri="urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e" value="ClearKey1.0"><cenc:default_KID>${kid}</cenc:default_KID></ContentProtection>`
            text = text.replace('<ContentProtection', ckEntry + '\n        <ContentProtection')
          }
          res.setHeader('Content-Type', 'application/dash+xml')
          res.setHeader('Cache-Control', 'no-cache')
          return res.end(text)
        } catch (e) { res.statusCode = 502; return res.end('tp-mpd-proxy error') }
      })
    },
  }
}

// Dev-time proxy for /api/m3u-proxy?url=... — fetches the M3U server-side
function m3uDevProxy() {
  return {
    name: 'm3u-proxy-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/m3u-proxy')) return next()
        const rawUrl = new URL(req.url, 'http://localhost').searchParams.get('url')
        if (!rawUrl) { res.statusCode = 400; return res.end('Missing ?url=') }
        let targetUrl
        try { targetUrl = decodeURIComponent(rawUrl); new URL(targetUrl) } catch { res.statusCode = 400; return res.end('Invalid URL') }
        try {
          const r = await fetch(targetUrl, { headers: { 'User-Agent': 'TiviMate/4.6.0 (Android)', 'Accept': '*/*' } })
          const text = await r.text()
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/x-mpegurl')
          res.statusCode = r.status
          return res.end(text)
        } catch (err) {
          console.error('[m3u-proxy-dev]', err.message)
          res.statusCode = 502; return res.end('m3u proxy error')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sonyLivDevProxy(), m3uDevProxy(), tpLicenseDevProxy(), tpMpdProxyDev(), tpApiDevProxy()],
  server: {
    proxy: {
      '/cf-sonyliv': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: () => '/drmlive/sliv-live-events/main/sonyliv.json',
      },
      '/api/cf-dynamic': {
        target: 'https://newwwwapiiiiii.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cf-dynamic/, '/main'),
      },
      '/fc-cdn': {
        target:       'https://in-mc-fblive.fancode.com',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/fc-cdn/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('referer')
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('sec-fetch-site')
            proxyReq.removeHeader('sec-fetch-mode')
            proxyReq.removeHeader('sec-fetch-dest')
            proxyReq.removeHeader('sec-fetch-storage-access')
            proxyReq.removeHeader('sec-fetch-user')
          })
        },
      },
    },
  },
})
