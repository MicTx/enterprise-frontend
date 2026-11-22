import { defineConfig } from '@playwright/test';

// e2e 冒烟：webServer 起 umi dev（mock 生效）；本地复用已起服务。
// PLAYWRIGHT_BASE_URL 允许本机 8000 端口被占用时改用其它端口（采集命令与
// webServer 同源），不进 CI 首版（runner 未定）；浏览器只装 chromium。
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000';
const port = new URL(baseURL).port || '80';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
