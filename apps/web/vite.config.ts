import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Website build/dev settings.
 *
 * In development the website runs on its own address (port 5173) but calls the
 * engine on port 4000. The proxy below forwards anything starting with `/api`
 * to the engine, so the browser code can always use simple relative paths —
 * and those same paths work unchanged in Docker (where nginx does the same job).
 */
const ENGINE_URL = process.env.CAMELOT_ENGINE_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: ENGINE_URL,
        changeOrigin: true,
      },
    },
  },
});
