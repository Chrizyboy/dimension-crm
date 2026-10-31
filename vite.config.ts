/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Tauri setzt TAURI_ENV_PLATFORM beim Bauen der Desktop-App. Dann brauchen wir keinen Service Worker,
// die PWA-Teile sind nur für die Handy-/Browser-Variante.
const isTauri = Boolean(process.env.TAURI_ENV_PLATFORM)

/**
 * Lädt die zwei Hauptschriften (Latin) gleich mit der Seite. Ohne das kommen sie erst nach dem CSS,
 * der Text springt beim Austausch der Schrift und die Startseite verschiebt sich (Lighthouse «CLS»).
 */
function schriftenVorladen(): Plugin {
  return {
    name: 'schriften-vorladen',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      const dateien = Object.keys(ctx.bundle ?? {}).filter((f) => /(public-sans|schibsted-grotesk)-latin-wght/.test(f))
      return dateien.map((f) => ({
        tag: 'link',
        attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `./${f}` },
        injectTo: 'head' as const,
      }))
    },
  }
}

export default defineConfig({
  base: './',
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true, routesDirectory: './src/app' }),
    react(),
    tailwindcss(),
    schriftenVorladen(),
    VitePWA({
      disable: isTauri,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'logo/*.png'],
      manifest: {
        name: 'Dimension Work',
        short_name: 'Dimension',
        description: 'CRM und ERP für Dimension Solaire',
        lang: 'de-CH',
        theme_color: '#02224F',
        background_color: '#02224F',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  build: { target: 'es2022', sourcemap: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs', 'supabase/functions/**/*.test.ts'],
    css: false,
  },
})
