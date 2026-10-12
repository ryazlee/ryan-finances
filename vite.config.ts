import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

const pages = process.env.GITHUB_PAGES === 'true'

function spaFallback() {
  return {
    name: 'spa-fallback',
    apply: 'build' as const,
    closeBundle() {
      const indexPath = path.resolve('dist/index.html')
      if (!fs.existsSync(indexPath)) return
      fs.copyFileSync(indexPath, path.resolve('dist/404.html'))
    },
  }
}

export default defineConfig({
  base: pages ? '/ryan-finances/' : '/',
  plugins: [tailwindcss(), react(), pages ? spaFallback() : cloudflare()],
})
