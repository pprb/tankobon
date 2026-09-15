import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// https://vitest.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});
