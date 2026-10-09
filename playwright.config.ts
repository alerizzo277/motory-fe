import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    ...(process.env.PLAYWRIGHT_CHROME_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } } : {}),
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    env: { VITE_GRAPHQL_URL: 'http://127.0.0.1:3001/graphql' },
  },
})
