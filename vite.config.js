import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// The app's version (from package.json), sent with every cloud request so Supabase can refuse old apps (0.21.0).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Tauri expects a fixed port during development and doesn't want the screen cleared.
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: 'chrome105', chunkSizeWarningLimit: 2000 },
});
