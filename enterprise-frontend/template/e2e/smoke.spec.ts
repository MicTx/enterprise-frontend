import { expect, type Page, test } from '@playwright/test';

// e2e 冒烟六条：登录回跳 / 列表渲染 / 新建提交 / 按钮级权限 / 无权深链 403 /
// 暗色偏好持久化。数据全走 umi mock（dev server），无外部依赖。
// 账号见 mock/auth.ts：admin/admin123（含 projects:manage）、viewer/viewer123（只读）。
//
// dev server 冷启动首次打包可到 1–2 分钟（页面会先渲染 "Bundling…"）。webServer
// 的 url 就绪只代表 HTTP 可达，不代表 bundle 完成；因此等待登录表单可见再跑用例，
// 与 visual.spec 的「目标元素可见 + networkidle」就绪判据一致。
test.describe.configure({ timeout: 300_000 });

async function login(page: Page, username: string, password: string) {
  await page.goto('/?login=1');
  await page
    .getByLabel('用户名')
    .waitFor({ state: 'visible', timeout: 180_000 });
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: /^登\s?录$/ }).click();
  // 登录成功整页跳转回首页
  await page.waitForURL((url) => !url.searchParams.has('login'));
}

async function openProjects(page: Page) {
  await page.getByRole('link', { name: '项目管理' }).click();
  await page.waitForURL('**/projects');
}

test.beforeEach(async ({ page, request }) => {
  // 用例隔离：mock 内存态在 dev server 上跨用例/spec 持久；每条冒烟用例前
  // 恢复到 seed，避免「新建项目」插入的动态行泄漏给后续用例（含视觉采集）。
  const reset = await request.post('/api/__mock/reset/projects', {
    timeout: 180_000,
  });
  expect(reset.ok()).toBe(true);
  // 未登录访问任何页面都会被 401 收敛到 /?login=1，直接从登录页起步避免导航打断
  await page.goto('/?login=1');
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('my-admin.settings');
  });
  // 冷启动打包完成前不进入用例；180s 覆盖首包最坏时长，测试总超时见上方 configure。
  await page
    .getByLabel('用户名')
    .waitFor({ state: 'visible', timeout: 180_000 });
});

test('admin 登录后可见项目管理菜单并进入列表', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await expect(page.getByRole('link', { name: '项目管理' })).toBeVisible();
  await openProjects(page);
  // mock 示例数据首行可见（分页默认 10 条）
  await expect(
    page.getByRole('cell', { name: '长三角水体遥感监测' }),
  ).toBeVisible();
});

test('新建项目提交后列表出现新行', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await openProjects(page);
  // mock 数据是 dev server 内存态、跨用例累积，用唯一名称避免歧义
  const name = `e2e 冒烟新建项目 ${Date.now()}`;
  await page.getByRole('button', { name: /新建项目/ }).click();
  await page.getByLabel('项目名称').fill(name);
  await page.getByLabel('负责人').fill('陈屿');
  await page.getByRole('button', { name: /^保\s?存$/ }).click();
  await expect(page.getByRole('cell', { name })).toBeVisible({
    timeout: 10_000,
  });
});

test('viewer 登录后无写权限（新建按钮不渲染）', async ({ page }) => {
  await login(page, 'viewer', 'viewer123');
  await openProjects(page);
  await expect(
    page.getByRole('cell', { name: '长三角水体遥感监测' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /新建项目/ })).toHaveCount(0);
});

test('未登录深链 /projects 被 401 收敛到登录弹层并带回跳', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForURL(
    (url) => url.pathname === '/' && url.searchParams.has('login'),
    { timeout: 10_000 },
  );
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/projects');
  await dialog.getByLabel('用户名').fill('admin');
  await dialog.getByLabel('密码').fill('admin123');
  await dialog.getByRole('button', { name: /^登\s?录$/ }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByRole('cell', { name: '长三角水体遥感监测' }),
  ).toBeVisible();
});

test('暗色偏好经设置抽屉持久化，刷新后仍生效', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  // 打开设置抽屉（悬浮齿轮），主题区「暗色风格」块（Tooltip 承载文字，类名语义化定位）
  await page.locator('.ant-pro-setting-drawer-handle').click();
  await page
    .locator('.ant-pro-setting-drawer-block-checkbox-item-realDark')
    .click();
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('my-admin.settings');
    return raw ? (JSON.parse(raw) as { navTheme?: string }) : null;
  });
  expect(stored?.navTheme).toBe('realDark');
  // 刷新后偏好仍被读取（布局设置真源回放）
  await page.reload();
  await expect(page.getByRole('link', { name: '项目管理' })).toBeVisible();
  const after = await page.evaluate(() => {
    const raw = localStorage.getItem('my-admin.settings');
    return raw ? (JSON.parse(raw) as { navTheme?: string }) : null;
  });
  expect(after?.navTheme).toBe('realDark');
});

test('404 路由兜底页可达', async ({ page }) => {
  // 登录后再访问不存在路径（未登录会先被 401 收敛带走）
  await login(page, 'admin', 'admin123');
  await page.goto('/definitely-missing-page');
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByText('页面不存在或已被移动。')).toBeVisible();
});
