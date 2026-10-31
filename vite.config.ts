import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      // New versions wait until you tap "Update" on the home screen (see src/App.tsx).
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Mandarin Daily',
        short_name: '每天',
        description: 'Daily Mandarin listening & speaking practice (HSK 1)',
        theme_color: '#c4302b',
        background_color: '#f7f2ea',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Precache the app shell + all audio so sessions work offline
        globPatterns: ['**/*.{js,css,html,png,svg,json,mp3}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
})
