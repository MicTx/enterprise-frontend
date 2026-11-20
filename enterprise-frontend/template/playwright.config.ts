import { defineConfig } from '@playwright/test';

// e2e 冒烟：webServer 起 umi dev（mock 生效）；本地复用已起服务。
// 不进 CI 首版（runner 未定）；浏览器只装 chromium。
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://localhost:8000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8000',
    timeout: 180_000,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
