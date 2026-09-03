import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['rssb-logo.png'],
      manifest: {
        name: 'RSSB Medical Invoice Workflow System',
        short_name: 'RSSB Invoices',
        description: 'District submission, HQ reception, verification, and Finance handoff for RSSB medical invoices.',
        theme_color: '#0b3d78',
        background_color: '#f4f6f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules\/(react|react-dom)\// },
            { name: 'vendor-recharts', test: /node_modules\/(recharts|d3-[a-z-]+)\// },
            { name: 'vendor-supabase', test: /node_modules\/@supabase\// },
          ],
        },
      },
    },
  },
})
