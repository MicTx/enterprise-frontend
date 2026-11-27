import { expect, type Page, test } from '@playwright/test';

// 项目页交互契约 e2e（experience-motion §3，与 Jest 互补的真实浏览器验证）：
// - 干净取消不弹确认；脏数据取消默认焦点在「继续编辑」；
// - 删除确认默认焦点在「取消」，连按 Enter 不发 DELETE；
// - 慢保存途中的重复点击只产生一次写请求；
// - 详情关闭不闪骨架；
// - 中文输入法选词回车不触发搜索；
// - 窄屏（375）下主操作「新建项目」仍可点。
//
// 数据走 umi mock；每条用例前 reset 到 seed，与 smoke.spec 同一隔离策略。
test.describe.configure({ timeout: 300_000 });

async function login(page: Page, username: string, password: string) {
  await page.goto('/?login=1');
  await page
    .getByLabel('用户名')
    .waitFor({ state: 'visible', timeout: 180_000 });
  await page.getByLabel('用户名').fill(username);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: /^登\s?录$/ }).click();
  await page.waitForURL((url) => !url.searchParams.has('login'));
}

async function openProjects(page: Page) {
  await page.getByRole('link', { name: '项目管理' }).click();
  await page.waitForURL('**/projects');
}

test.beforeEach(async ({ page, request }) => {
  const reset = await request.post('/api/__mock/reset/projects', {
    timeout: 180_000,
  });
  expect(reset.ok()).toBe(true);
  await page.goto('/?login=1');
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('my-admin.settings');
  });
  await page
    .getByLabel('用户名')
    .waitFor({ state: 'visible', timeout: 180_000 });
});

test('新建表单干净态点取消直接关闭，不弹确认', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await openProjects(page);
  const create = page.getByRole('button', { name: /新建项目/ });
  await create.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /^取\s?消$/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.project-form-dialog')).toHaveCount(0);
  await expect(create).toBeFocused();
  // 不应再出现「放弃未保存的更改？」确认
  await expect(page.getByText('放弃未保存的更改？')).toHaveCount(0);
});

test('脏数据取消弹确认，默认焦点在「继续编辑」', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await openProjects(page);
  await page.getByRole('button', { name: /新建项目/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('项目名称').fill('未保存的项目名');
  await dialog.getByRole('button', { name: /^取\s?消$/ }).click();
  // 确认弹层出现，表单弹层仍在
  const confirm = page
    .getByRole('dialog')
    .filter({ hasText: '放弃未保存的更改？' });
  await expect(confirm).toBeVisible();
  // 焦点默认在非破坏动作上；按 Enter 等同于点「继续编辑」
  const keepBtn = confirm.getByRole('button', { name: /继续编辑/ });
  await expect(keepBtn).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(confirm).not.toBeVisible();
  // 原输入保留
  await expect(dialog.getByLabel('项目名称')).toHaveValue('未保存的项目名');
});

test('删除确认默认焦点在「取消」，连按 Enter 不发 DELETE', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await openProjects(page);
  const deleteCalls: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'DELETE') {
      deleteCalls.push(req.url());
    }
  });
  const row = page.getByRole('row', { name: /长三角水体遥感监测/ });
  await row.getByRole('button', { name: /^删\s?除$/ }).click();
  const confirm = page
    .getByRole('dialog')
    .filter({ hasText: '删除项目「长三角水体遥感监测」？' });
  await expect(confirm).toBeVisible();
  const cancelBtn = confirm.getByRole('button', { name: /^取\s?消$/ });
  await expect(cancelBtn).toBeFocused();
  // 连按 Enter 多次（焦点在取消上）：只触发 cancel，不发 DELETE
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(confirm).not.toBeVisible();
  expect(deleteCalls).toHaveLength(0);
  // 行仍在
  await expect(
    page.getByRole('cell', { name: '长三角水体遥感监测' }),
  ).toBeVisible();
});

test('保存进行中重复点击只提交一次', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await openProjects(page);
  const postCalls: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/projects')) {
      postCalls.push(req.url());
    }
  });
  // 控制写入完成时机，重复用户动作一定发生在同一笔请求在途时。
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/projects', async (route) => {
    if (route.request().method() === 'POST') await gate;
    await route.continue();
  });
  const create = page.getByRole('button', { name: /新建项目/ });
  await create.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('项目名称').fill('重复点击测试项目');
  await dialog.getByLabel('负责人').fill('测试人');
  const saveBtn = dialog.getByRole('button', { name: /^保\s?存$/ });
  const bounds = await saveBtn.boundingBox();
  if (!bounds) throw new Error('保存操作在提交前不可见');
  await saveBtn.click();
  try {
    await expect.poll(() => postCalls.length).toBe(1);
    await page.mouse.dblclick(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: /放弃更改/ })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.project-form-dialog')).toHaveCount(0);
  await expect(create).toBeFocused();
  expect(postCalls).toHaveLength(1);
  await create.click();
  await expect(dialog.getByLabel('项目名称')).toHaveValue('');
});

test('详情抽屉关闭过程不闪骨架', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await openProjects(page);
  const row = page.getByRole('row', { name: /长三角水体遥感监测/ });
  await row.getByRole('button', { name: /^详\s?情$/ }).click();
  const drawer = page.locator('.ant-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText('长三角水体遥感监测')).toBeVisible();
  // 关闭抽屉：过程中骨架不应短暂出现
  await drawer.locator('.ant-drawer-close').click();
  // 在抽屉刚关闭的瞬间断言无骨架节点
  await expect(drawer.locator('.ant-skeleton')).toHaveCount(0);
  await expect(drawer).not.toBeVisible();
});

test('中文输入法选词回车不触发搜索', async ({ page }) => {
  await login(page, 'admin', 'admin123');
  await openProjects(page);
  const searchInput = page.getByPlaceholder('搜索名称/负责人');
  await expect(
    page.getByRole('cell', { name: '长三角水体遥感监测' }),
  ).toBeVisible();
  await searchInput.fill('海岸带');
  // 进入 IME 组合态：compositionstart 后所有 keydown 都应视为选词过程
  await searchInput.evaluate((el: HTMLInputElement) => {
    el.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
  });
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/projects') && req.method() === 'GET') {
      requests.push(req.url());
    }
  });
  // 组合态内按 Enter（isComposing=true 的 keydown）不应触发搜索
  await searchInput.evaluate((el: HTMLInputElement) => {
    const ev = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      isComposing: true,
    });
    Object.defineProperty(ev, 'keyCode', { value: 13 });
    el.dispatchEvent(ev);
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  expect(requests).toHaveLength(0);
  // 组合结束后再回车：应正常触发一次搜索
  await searchInput.evaluate((el: HTMLInputElement) => {
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  });
  const submittedSearch = page.waitForRequest(
    (req) =>
      new URL(req.url()).searchParams.get('keyword') === '海岸带' &&
      req.method() === 'GET',
  );
  await searchInput.press('Enter');
  await submittedSearch;
  await expect(
    page.getByRole('cell', { name: '海岸带侵蚀监测' }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
});

test('窄屏（375）下「新建项目」主操作可达可点', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, 'admin', 'admin123');
  await page.goto('/projects');
  // 主操作按钮应在首屏可达（不被裁切、不被遮挡）
  const createBtn = page.getByRole('button', { name: /新建项目/ });
  await expect(createBtn).toBeVisible();
  const box = await createBtn.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    // 按钮中心点应落在视口内（可触及）
    expect(box.x + box.width / 2).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width / 2).toBeLessThanOrEqual(375);
    expect(box.y + box.height / 2).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height / 2).toBeLessThanOrEqual(812);
  }
  const title = page
    .locator('.ant-card-head-title')
    .filter({ hasText: '项目管理' });
  await expect(title).toBeVisible();
  expect(
    await title.evaluate((node) => node.clientWidth >= node.scrollWidth),
  ).toBeTruthy();
  const firstName = page.getByRole('cell', { name: '长三角水体遥感监测' });
  await expect(firstName).toBeVisible();
  expect(await firstName.evaluate((cell) => cell.clientWidth)).toBeGreaterThan(
    80,
  );
  // 可点开弹层
  await createBtn.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
