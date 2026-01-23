import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/gbapi': {
        target: 'https://www.giantbomb.com', // ⚠️ PAS /api ici
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/gbapi/, ''),
      }
    }
  }
})
