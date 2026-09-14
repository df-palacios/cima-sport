const { defineConfig, devices } = require('@playwright/test');

/**
 * Antes de correr:
 *   backend  -> cd backend && npm start        (http://localhost:4001)
 *   frontend -> cd frontend && npm run dev     (http://localhost:5175)
 *
 * PW_CHROMIUM_PATH permite reusar un Chromium ya instalado en la máquina.
 */
module.exports = defineConfig({
  testDir: './specs',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'escritorio',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
      },
    },
    {
      name: 'movil',
      use: {
        ...devices['Pixel 7'],
        ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
      },
    },
  ],
});
