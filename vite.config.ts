import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Raíz por defecto; en GitHub Pages se pasa VITE_BASE=/rutina-cosmetica/
  base: process.env.VITE_BASE || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: null,
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // OBF product images are cross-origin; cache them at runtime in the SW.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Rutina Cosmética',
        short_name: 'Rutina',
        description:
          'Crea rutinas de tratamientos cosméticos y recibe un aviso a la hora de cada paso.',
        lang: 'es',
        dir: 'ltr',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        // Relativos: funcionan tanto en la raíz como en un subpath
        // (p. ej. GitHub Pages: /rutina-cosmetica/).
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-monochrome-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'monochrome',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
