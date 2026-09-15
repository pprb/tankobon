import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    // node-unrar-js's Emscripten glue locates its .wasm file relative to its own
    // `__dirname`, which breaks once bundled into main.js. We hand it the bytes
    // ourselves (see cbr-archive.ts) from this copy placed next to the bundle.
    viteStaticCopy({
      targets: [
        { src: 'node_modules/node-unrar-js/esm/js/unrar.wasm', dest: '.', rename: { stripBase: true } },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      // `node:sqlite` isn't in Node's `builtinModules` list yet (still experimental),
      // so the forge Vite plugin doesn't externalize it on its own.
      external: ['node:sqlite'],
    },
  },
});
