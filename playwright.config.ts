import { defineConfig } from '@playwright/test';

// Smoke tests of the packaged app (`npm run test:e2e`, see docs/development.md). Not part of
// `npm test`: they need `npm run package` first, and a display (xvfb on a headless Linux).
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // One app at a time: each test starts the whole application.
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
});
