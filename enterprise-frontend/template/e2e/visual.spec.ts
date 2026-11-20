import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, type Page, test } from '@playwright/test';

// 视觉走查采集（references/visual-review.md §证据采集协议）。
// 8 格矩阵 = 4 路由 × 2 格（默认态 light/zh-CN、最大偏离态 realDark/en-US）。
// 偏好经 localStorage 预置（my-admin.settings.navTheme + umi_locale）；
// /projects 走真实 admin 登录流（mock 账号见 mock/auth.ts：admin/admin123），
// /403、/404 处于登录态才不会被 401 收敛带走，故预置 mock token（等价登录产物）。
// 截图默认写 test-results/visual（被 .gitignore 忽略）；可用环境变量
// VISUAL_EVIDENCE_DIR 覆盖到证据包目录。不得硬编码构建机绝对路径或内部包路径。
const EVIDENCE_DIR =
  process.env.VISUAL_EVIDENCE_DIR ?? path.resolve('test-results/visual');

// 证据目录随项目存在；缺失时自建，避免首跑失败。
mkdirSync(EVIDENCE_DIR, { recursive: true });

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });

// dev server 冷启动首次打包可到 1–2 分钟（Bundling…）：就绪等待给足预算，
// 避免把「编译中」误判为页面不就绪；就绪判据本身仍是目标元素可见 + networkidle。
const READY_TIMEOUT = 120_000;
test.describe.configure({ timeout: 300_000 });

// 用例隔离：dev server 的 mock 内存态跨 spec 持久，smoke「新建项目」会向
// projects 列表插入动态行。每条视觉用例前把 mock 恢复到 seed，保证全量运行时
// projects 两格与 v1 基线逐像素一致（不依赖 -- e2e/visual.spec.ts 隔离采集）。
test.beforeEach(async ({ request }) => {
  // 冷启动首次请求可能触发打包，超时预算与 READY_TIMEOUT 对齐。
  const reset = await request.post('/api/__mock/reset/projects', {
    timeout: READY_TIMEOUT,
  });
  expect(reset.ok()).toBe(true);
});

type NavTheme = 'light' | 'realDark';
type Locale = 'zh-CN' | 'en-US';

interface Combo {
  navTheme: NavTheme;
  locale: Locale;
}

// 每路由两格：默认态（light + zh-CN，产品默认语言亮色）与最大偏离态
// （realDark + en-US，暗色算法 + 对译文案）；8 格总量入 git 可控。
const COMBOS: Combo[] = [
  { navTheme: 'light', locale: 'zh-CN' },
  { navTheme: 'realDark', locale: 'en-US' },
];

interface RouteCase {
  /** 截图文件名前缀（<route|home>-<theme>-<locale>.png） */
  file: string;
  /** 实际打开的路由（首页取登录弹层入口态，见 plan P8） */
  openPath: string;
  /** 是否走真实登录流（仅 /projects）；其余路由预置 mock token */
  loginFlow: boolean;
  /** 首页为登录弹层态：不预置 token，等待未登录首页弹层 */
  loginModal?: boolean;
  /** 目标状态就绪判定（协议：目标元素可见优先，networkidle 可选） */
  ready: (page: Page) => Promise<void>;
}

const ROUTES: RouteCase[] = [
  {
    file: 'home',
    openPath: '/?login=1',
    loginFlow: false,
    loginModal: true,
    ready: async (page) => {
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: READY_TIMEOUT });
      await expect(
        dialog.locator('input[autocomplete="username"]'),
      ).toBeVisible({ timeout: READY_TIMEOUT });
      await expect(
        dialog.locator('input[autocomplete="current-password"]'),
      ).toBeVisible({ timeout: READY_TIMEOUT });
      // 菜单骨架与主内容同在（布局 chrome 在这两格被完整采证）
      await expect(page.locator('.ant-pro-layout')).toBeVisible({
        timeout: READY_TIMEOUT,
      });
    },
  },
  {
    file: 'projects',
    openPath: '/projects',
    loginFlow: true,
    ready: async (page) => {
      // mock 示例数据首行（locale 无关）与新建按钮（admin 权限可见）
      await expect(
        page.getByRole('cell', { name: '长三角水体遥感监测' }),
      ).toBeVisible({ timeout: READY_TIMEOUT });
      await expect(
        page.getByRole('button', { name: /新建项目|New project/ }),
      ).toBeVisible({ timeout: READY_TIMEOUT });
    },
  },
  {
    file: '403',
    openPath: '/403',
    loginFlow: false,
    ready: async (page) => {
      await expect(page.locator('.ant-result-title')).toHaveText('403', {
        timeout: READY_TIMEOUT,
      });
      await expect(
        page.getByText(/没有该页面的访问权限|You do not have access/),
      ).toBeVisible({ timeout: READY_TIMEOUT });
      await expect(
        page.getByRole('button', { name: /返回首页|Back to home/ }),
      ).toBeVisible({ timeout: READY_TIMEOUT });
    },
  },
  {
    file: '404',
    openPath: '/404',
    loginFlow: false,
    ready: async (page) => {
      await expect(page.locator('.ant-result-title')).toHaveText('404', {
        timeout: READY_TIMEOUT,
      });
      await expect(
        page.getByText(/页面不存在或已被移动|Page not found or has been moved/),
      ).toBeVisible({ timeout: READY_TIMEOUT });
      await expect(
        page.getByRole('button', { name: /返回首页|Back to home/ }),
      ).toBeVisible({ timeout: READY_TIMEOUT });
    },
  },
];

// 登录流参照 e2e/smoke.spec.ts：登录弹层挂在首页 ?login=1，成功整页回跳。
// 用户名/密码密码框以 autocomplete 语义定位，避免语言注入后文案定位漂移。
async function loginAsAdmin(page: Page) {
  await page.goto('/?login=1');
  const username = page.locator('input[autocomplete="username"]');
  await expect(username).toBeVisible({ timeout: READY_TIMEOUT });
  await username.fill('admin');
  await page.locator('input[autocomplete="current-password"]').fill('admin123');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.searchParams.has('login'), {
    timeout: 60_000,
  });
}

// 截图前冻结动画并等字体/布局稳定（协议 §证据采集协议：动画冻结 + 字体就绪 +
// 连续两次 rAF；有限动画先推进到完成，避免把弹层停在淡入中间态）。
async function settleBeforeCapture(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const animations = document.getAnimations?.() ?? [];
    await Promise.race([
      Promise.all(
        animations.map((animation) =>
          animation.finished.catch(() => undefined),
        ),
      ),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  await page.addStyleTag({
    content:
      '*, *::before, *::after { animation-play-state: paused !important; transition: none !important; caret-color: transparent !important; }',
  });
}

for (const route of ROUTES) {
  for (const { navTheme, locale } of COMBOS) {
    const combo = `${route.file}-${navTheme}-${locale}`;
    test(`${combo} 视觉走查截图`, async ({ page }) => {
      await page.addInitScript(
        ({
          navTheme,
          locale,
          token,
        }: {
          navTheme: NavTheme;
          locale: Locale;
          token: string | null;
        }) => {
          try {
            localStorage.setItem(
              'my-admin.settings',
              JSON.stringify({ navTheme }),
            );
            localStorage.setItem('umi_locale', locale);
            if (token) localStorage.setItem('token', token);
          } catch {
            // about:blank 等无 localStorage 的上下文，忽略
          }
        },
        {
          navTheme,
          locale,
          token: route.loginFlow || route.loginModal ? null : 'demo-admin',
        },
      );

      if (route.loginFlow) {
        await loginAsAdmin(page);
      }
      await page.goto(route.openPath);

      await route.ready(page);

      // 就绪判定：目标元素可见为主，networkidle 为可选增强；不可达（SSE/长轮询
      // 类页面）时降级记 load 状态作为替代依据（写入证据包 readiness 字段）。
      let readiness = 'networkidle';
      try {
        await page.waitForLoadState('networkidle', { timeout: 15_000 });
      } catch {
        readiness = 'load';
        await page.waitForLoadState('load');
      }
      console.log(`VISUAL_READINESS ${combo} ${readiness}`);

      await settleBeforeCapture(page);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `${combo}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
