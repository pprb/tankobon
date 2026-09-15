import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // `node:sqlite` isn't in Node's `builtinModules` list yet (still experimental),
      // so the forge Vite plugin doesn't externalize it on its own.
      external: ['node:sqlite'],
    },
  },
});
