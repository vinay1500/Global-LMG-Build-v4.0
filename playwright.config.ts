import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    actionTimeout: 15_000,
    baseURL: process.env.E2E_ADMIN_WEB_BASE || 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
