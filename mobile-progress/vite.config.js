import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: './',
      name: '한 장씩 · 성경 읽기 기록',
      short_name: '한 장씩',
      lang: 'ko',
      description: '성경 읽기 진도, 통독 목표와 분량 계산',
      start_url: './',
      scope: './',
      display: 'standalone',
      theme_color: '#224d3e',
      background_color: '#f6f5ef',
      icons: [{
        src: 'icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      }, {
        src: 'icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}']
    }
  })]
});
