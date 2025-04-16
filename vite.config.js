import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'global': 'globalThis',
  },
  optimizeDeps: {
    exclude: ['mongodb'],
  },
  build: {
    rollupOptions: {
      external: ['mongodb']
    }
  },
  server: {
    headers: {
      // Set relaxed COOP header for Firebase auth popups
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      // Set COEP header
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
