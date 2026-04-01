import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'MediGlow Business Management',
        short_name: 'MediGlow',
        description: 'Professional Billing & Inventory for Medical and Cosmetics',
        theme_color: '#0F0E17',
        background_color: '#0F0E17',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'pwa-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['business', 'finance', 'medical']
      }
    })
  ],
})
