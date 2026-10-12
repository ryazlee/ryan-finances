import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Custom domain / Workers static assets, not a GitHub Pages project path.
export default defineConfig({
  base: '/',
  plugins: [tailwindcss(), react(), cloudflare()],
})
