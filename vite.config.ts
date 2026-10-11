import { defineConfig } from 'vitest/config';

export default defineConfig({
  clearScreen: false,
  server: {
    // Tauri espera el frontend en este puerto (ver src-tauri/tauri.conf.json).
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**', '**/tools/**', '**/assets/**'] },
  },
  build: { target: 'es2022' },
  test: { include: ['tests/**/*.test.ts'] },
});
