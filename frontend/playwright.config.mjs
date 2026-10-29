import { defineConfig } from 'playwright/test'

const external = process.env.RAIN_BROWSER_BASE_URL
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: './tests/localization',
  outputDir: '../.runtime/browser-results',
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { outputFolder: '../.runtime/browser-report', open: 'never' }]],
  use: {
    baseURL: external || 'http://127.0.0.1:4173',
    browserName: 'chromium',
    reducedMotion: 'reduce',
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: external
    ? undefined
    : {
        command: 'corepack pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false
      }
})
