import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Same-origin proxy: browser sends no Origin/sec-fetch-site headers,
      // so FanCode CDN treats it as a direct request and doesn't 403.
      '/fc-cdn': {
        target:      'https://in-mc-fblive.fancode.com',
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/fc-cdn/, ''),
      },
    },
  },
})
