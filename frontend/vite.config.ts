import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/gbapi': {
        target: 'https://www.giantbomb.com',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/gbapi/, ''),
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
