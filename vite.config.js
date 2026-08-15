import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { camelotDataPlugin } from './server/camelot-data-plugin.js';

// Camelot dev config.
// The camelotDataPlugin adds the tiny local persistence server that reads/writes
// the JSON files in src/data/*.json — those files are the SINGLE SOURCE OF TRUTH.
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite's own env loading only exposes vars to client code via import.meta.env.
  // server/higgsfield.js runs in this Node process and reads process.env directly,
  // so copy .env into process.env here (empty prefix = load everything, not just VITE_*).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [react(), camelotDataPlugin()],
    server: {
      port: 5173,
      open: false,
      strictPort: false,
    },
  };
});
