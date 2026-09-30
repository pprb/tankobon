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
      external: [
        // `node:sqlite` isn't in Node's `builtinModules` list yet (still experimental),
        // so the forge Vite plugin doesn't externalize it on its own.
        'node:sqlite',
        // Left as real npm packages rather than bundled: `@napi-rs/canvas` is a native
        // N-API addon (Rollup can't inline a `.node` binary), and `pdfjs-dist`'s `legacy`
        // build is itself a foreign webpack bundle that Rollup can't safely re-bundle.
        // Both are resolved from node_modules at runtime instead (see pdf-archive.ts),
        // which also means pdfjs-dist's `standard_fonts`/`cmaps` data directories ship
        // for free without needing a separate copy step.
        '@napi-rs/canvas',
        'pdfjs-dist/legacy/build/pdf.mjs',
      ],
    },
  },
});
