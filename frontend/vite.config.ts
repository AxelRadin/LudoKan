import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          sentry: ['@sentry/react'],
          vendor: ['@tanstack/react-query', 'i18next', 'react-i18next'],
        },
      },
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws-notifications': {
        target: 'http://localhost:8000',
        ws: true,
      },
      '/gbapi': {
        target: 'https://www.giantbomb.com',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/gbapi/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws-notifications': {
        target: 'http://localhost:8000',
        ws: true,
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      exclude: ['src/assets/**', 'src/test/**', '**/*.d.ts', '**/index.ts'],
    },
  },
});
