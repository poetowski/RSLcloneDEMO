import { defineConfig } from 'vite';

// Relative base so the build works from any sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { main: 'index.html', gallery: 'gallery.html' },
    },
  },
  server: { port: 5173 },
  test: { include: ['tests/**/*.test.ts'] },
});
