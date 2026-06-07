import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
              accept: req.headers['accept'] || '*/*',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sonyLivDevProxy()],
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
