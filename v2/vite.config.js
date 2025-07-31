import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/nil-gameplan/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});