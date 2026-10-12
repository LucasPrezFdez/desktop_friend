import { defineConfig } from 'vitest/config';

export default defineConfig({
  clearScreen: false,
  server: {
    // Tauri espera el frontend en este puerto (ver src-tauri/tauri.conf.json).
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**', '**/tools/**', '**/assets/**'] },
  },
  // Dos páginas: la ventana del perro y la de la cama.
  build: { target: 'es2022', rolldownOptions: { input: ['index.html', 'bed.html'] } },
  test: { include: ['tests/**/*.test.ts'] },
});
