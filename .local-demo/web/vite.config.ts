import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@aztec/bb.js'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 7500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@aztec/bb.js')) return 'barretenberg';
          if (id.includes('@noir-lang')) return 'noir-runtime';
        },
      },
    },
  },
})
