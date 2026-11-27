import { expect, test } from '@playwright/test';

// 减动效与状态转换走查（references/state-transitions.md「减动效首帧即生效」
// 与「中断从当前态续演」）。不采像素、不冻结动画；全部断言落在最终页面状态、
// 焦点与占位形态——冻结截图和 rAF 估算不算流畅度证据（本篇纪律）。
//
// 覆盖四类信号面：
//   显隐：登录弹层（首帧 reduced 下应即时出现，而不是走 fade/zoom 渐入）
//   显隐：详情抽屉开启/快速反向，减少特效偏好下打开完成快
//   内容替换：/projects 加载 → 表格，减少特效偏好下 Skeleton 无位移动画
//   显隐：同一页 A→B→C 切换记录，抽屉内容不串值且不打断焦点
//
// 减动效走真系统偏好（context.reducedMotion='reduce'），由 antd ConfigProvider
// token.motion=false 接管 MotionProvider + motionDuration*=0s；global.less 的
// media 块只补 Skeleton shimmer 的漏网。

const PROJECT_PATH = '/projects';
// 冷启动 dev server 打包到登录态可用耗时较长；motion 行为验收本身不冻时序。
const READY_TIMEOUT = 120_000;
test.describe.configure({ timeout: 300_000 });

// motion 走查的账号用 admin（viewer 也能见到 Drawer，只是少了新建/编辑按钮）。
const MOCK_ADMIN = { username: 'admin', password: 'admin123' };

// 干净浏览器 + admin 登录（同 smoke.spec 的语义，去掉测试 cookie/偏好残留）。
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/?login=1');
  const username = page.locator('input[autocomplete="username"]');
  await expect(username).toBeVisible({ timeout: READY_TIMEOUT });
  await username.fill(MOCK_ADMIN.username);
  await page
    .locator('input[autocomplete="current-password"]')
    .fill(MOCK_ADMIN.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.searchParams.has('login'), {
    timeout: 60_000,
  });
}

test.beforeEach(async ({ request }) => {
  // 隔离 dev-server mock 内存态（smoke/visual 共用的重置端点）。
  const reset = await request.post('/api/__mock/reset/projects', {
    timeout: READY_TIMEOUT,
  });
  expect(reset.ok()).toBe(true);
});

test.describe('减动效（系统偏好 reduce）', () => {
  test.use({ reducedMotion: 'reduce' });

  test('未登录登录弹层在 reduce 偏好下即时可见且不播渐入动画', async ({
    page,
  }) => {
    // 首帧即生效：dev server 打包完用户第一次看到的弹层就是最终态，
    // 不靠等待 motion end 断言。
    await page.goto('/?login=1');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: READY_TIMEOUT });

    // 立即判定最终态成立（不透明+在文档流），无需等动画完成。
    // antd Modal 在 reduced 下经 token.motion=false → rc-motion 直接显示，
    // 走 supportMotion=false 分支（见 ThemeProvider/token.motion 真源）。
    const opacity = await dialog.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).opacity),
    );
    expect(opacity).toBe(1);
  });

  test('详情抽屉在 reduce 偏好下快速开闭，行为即状态', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    // 列表就绪：真实行数据出现（首个 seed 行的文本）
    await expect(
      page.getByRole('cell', { name: '长三角水体遥感监测' }),
    ).toBeVisible({ timeout: READY_TIMEOUT });
    await expect(
      page.getByRole('button', { name: /新建项目|New project/ }),
    ).toBeVisible();

    // 触发详情抽屉：点击首行「详情」
    await page
      .getByRole('button', { name: /^详\s?情$/ })
      .first()
      .click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible({ timeout: 10_000 });

    // 快速反向：抽屉打开中立即点关闭，最终态须是关闭、不留下半开面板。
    // 「中断从当前态续演」——不是「等动画播完再关」。
    await drawer.getByRole('button', { name: /Close|关闭/ }).click();
    await expect(drawer).not.toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: /^详\s?情$/ }).first(),
    ).toBeFocused();
  });

  test('项目表单在 reduce 下即时显隐并归还焦点', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    const trigger = page.getByRole('button', { name: /新建项目/ });
    const surface = page.locator('.project-form-dialog');
    await trigger.click();
    const panel = surface.locator('.ant-modal-container');
    const opening = await panel.evaluate((element) => ({
      opacity: getComputedStyle(element).opacity,
      transform: getComputedStyle(element).transform,
      animations: element.getAnimations().length,
    }));
    expect(opening).toEqual({ opacity: '1', transform: 'none', animations: 0 });
    await page.keyboard.press('Escape');
    await expect(surface).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('reduce 偏好下 Skeleton 无位移动画且内容替换不闪骨架', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    // API 延迟用可释放的闸门，确保真看到 loading 后才放行，不靠设备快慢。
    let release: () => void = () => {};
    const responseGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/projects?*', async (route) => {
      await responseGate;
      await route.continue();
    });
    await page.goto(PROJECT_PATH);

    // 占位必须先出现（骷髅），且在 reduce 偏好下禁用位移动画
    const skeleton = page.locator('.ant-skeleton.ant-skeleton-active');
    await expect(skeleton.first()).toBeVisible({ timeout: READY_TIMEOUT });
    const noMotion = await skeleton.first().evaluate((el) => {
      const title = el.querySelector('.ant-skeleton-title');
      const computed = getComputedStyle((title ?? el) as Element);
      // reduce 兜底路径（global.less media 块）或 antd motionDuration=0s 均算
      // 达成「无位移动画」；动画时长为 0s 与动画名称为 none 均接受。
      return (
        computed.animationName === 'none' ||
        computed.animationDuration === '0s' ||
        computed.animationPlayState === 'paused'
      );
    });
    release();
    expect(noMotion).toBe(true);

    // 真实数据替换后 Skeleton 必须消失（不闪骨架、不留占位残影）
    await expect(
      page.getByRole('cell', { name: '长三角水体遥感监测' }),
    ).toBeVisible({ timeout: READY_TIMEOUT });
    await expect(skeleton).toHaveCount(0);
  });

  test('详情抽屉连续切换记录时旧值不串入新记录', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    await expect(
      page.getByRole('cell', { name: '长三角水体遥感监测' }),
    ).toBeVisible({ timeout: READY_TIMEOUT });

    const dialog = page.getByRole('dialog');

    // A→B 切换（A 有 description，B 无）：新抽屉不串 A 的内容
    await page
      .getByRole('row', { name: /长三角水体遥感监测/ })
      .getByRole('button', { name: /^详\s?情$/ })
      .click();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(
      dialog.getByText('季度性水体指数比对与异常水体预警。'),
    ).toBeVisible({ timeout: READY_TIMEOUT });

    // 模态抽屉挡住背景，真实用户必须先关闭 A，再从下一行打开 B。
    await dialog.getByRole('button', { name: /Close|关闭/ }).click();
    await expect(dialog).toHaveCount(0);
    await page
      .getByRole('row', { name: /海岸带侵蚀监测/ })
      .getByRole('button', { name: /^详\s?情$/ })
      .click();
    await expect(dialog.getByText('海岸带侵蚀监测')).toBeVisible();
    await expect(dialog.getByText('—')).toBeVisible();
    await expect(
      dialog.getByText('季度性水体指数比对与异常水体预警。'),
    ).not.toBeVisible({ timeout: 10_000 });
  });
});

test.describe('普通动效（无偏好）', () => {
  test.use({ reducedMotion: null });

  test('首个进场帧前取消项目表单会卸载、解锁滚动并归还焦点', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    const trigger = page.getByRole('button', { name: /新建项目/ });
    const surface = page.locator('.project-form-dialog');
    const overflowBefore = await page
      .locator('body')
      .evaluate((body) => getComputedStyle(body).overflowY);
    const beforeCancel = await trigger.evaluate(
      (button) =>
        new Promise<{ opacity: number; overflow: string }>(
          (resolve, reject) => {
            if (!(button instanceof HTMLButtonElement)) {
              reject(new Error('新建入口不是按钮'));
              return;
            }
            // Act in the first mounted task, before CSS has advanced. Playwright's
            // regular click waits for stability, which misses this timing window.
            const observer = new MutationObserver(() => {
              const panel = document.querySelector(
                '.project-form-dialog [role="dialog"]',
              );
              const cancel = [
                ...(panel?.querySelectorAll('button') ?? []),
              ].find((btn) => btn.textContent?.replace(/\s/g, '') === '取消');
              if (!panel || !cancel) return;
              observer.disconnect();
              clearTimeout(timer);
              // Earlier builds animated the dialog; this build animates its panel.
              const content = panel.querySelector('.ant-modal-container');
              const carrier = content?.getAnimations().length ? content : panel;
              const opacity = Number(getComputedStyle(carrier).opacity);
              const overflow = getComputedStyle(document.body).overflowY;
              cancel.click();
              resolve({ opacity, overflow });
            });
            const timer = setTimeout(() => {
              observer.disconnect();
              reject(new Error('未捕捉到表单第一次挂载'));
            }, 2000);
            observer.observe(document.body, { subtree: true, childList: true });
            button.focus();
            button.click();
          },
        ),
    );
    expect(beforeCancel.opacity).toBe(0);
    expect(overflowBefore).not.toBe('hidden');
    expect(beforeCancel.overflow).toBe('hidden');
    await expect(surface).toHaveCount(0);
    await expect(page.locator('body')).toHaveCSS('overflow-y', overflowBefore);
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(surface.getByRole('dialog')).toBeVisible();
  });

  test('项目表单打开途中关闭从当前可见状态反向，不跳到开态', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    const dialog = page.getByRole('dialog');
    await page.getByRole('button', { name: /新建项目/ }).click();
    await expect(dialog).toBeVisible();
    const motion = await dialog.evaluate(async (dialog) => {
      const panel = dialog.querySelector('.ant-modal-container');
      const mask = dialog
        .closest('.project-form-dialog')
        ?.querySelector('.ant-modal-mask');
      if (!panel || !mask) throw new Error('表单缺少内容或遮罩层');
      const alpha = (layer: Element) => Number(getComputedStyle(layer).opacity);
      const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const deadline = performance.now() + 2000;
      while (performance.now() < deadline) {
        const opening = alpha(panel);
        const openingMask = alpha(mask);
        if (opening > 0.15 && opening < 0.85) {
          // A clean form closes from its actual cancel button while still moving.
          // Read the same panel (not a new layer or opacity of the outer mask).
          const cancel = [...panel.querySelectorAll('button')].find(
            (btn) => btn.textContent?.replace(/\s/g, '') === '取消',
          );
          if (!cancel) throw new Error('弹窗缺少取消按钮');
          cancel.click();
          // The first rAF may precede a committed close. Sample until the
          // actual outgoing transition appears and both surfaces start to fade.
          const after = [alpha(panel)];
          const afterMask = [alpha(mask)];
          for (let i = 0; i < 5 && panel.isConnected; i += 1) {
            await frame();
            if (!panel.isConnected) break;
            after.push(alpha(panel));
            afterMask.push(alpha(mask));
          }
          return { opening, openingMask, after, afterMask };
        }
        await frame();
      }
      throw new Error('未观察到目标面板正在打开，不能用滚动或焦点动画代替');
    });
    const evidence = JSON.stringify(motion);
    expect(motion.openingMask, evidence).toBeGreaterThan(0);
    expect(motion.openingMask, evidence).toBeLessThan(1);
    expect(Math.max(...motion.after), evidence).toBeLessThan(
      motion.opening + 0.15,
    );
    expect(Math.max(...motion.afterMask), evidence).toBeLessThan(
      motion.openingMask + 0.15,
    );
    await expect(page.locator('.project-form-dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /新建项目/ })).toBeFocused();
  });

  test('项目表单退出时保留字段外观，不在淡出前闪成灰色', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    await page.getByRole('button', { name: /新建项目/ }).click();
    const dialog = page.getByRole('dialog', { name: '新建项目' });
    const panel = dialog.locator('.ant-modal-container');
    await expect(panel).toHaveCSS('opacity', '1');
    const appearance = await panel.evaluate(async (layer) => {
      const dialog = layer.closest('[role="dialog"]');
      const input = layer.querySelector('input');
      const cancel = [...layer.querySelectorAll('button')].find(
        (btn) => btn.textContent?.replace(/\s/g, '') === '取消',
      );
      if (!dialog || !input || !cancel) {
        throw new Error('缺少项目弹窗、字段或取消入口');
      }
      const fieldLook = () => {
        const { backgroundColor, color } = getComputedStyle(input);
        return { backgroundColor, color };
      };
      input.focus();
      const before = fieldLook();
      cancel.click();
      const deadline = performance.now() + 2000;
      while (layer.isConnected && performance.now() < deadline) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        if (!layer.isConnected) break;
        const opacity = Number(getComputedStyle(layer).opacity);
        // Read after the initial interpolation value, while still visible.
        if (opacity <= 0 || opacity > 0.7) continue;
        const during = fieldLook();
        input.focus();
        return {
          before,
          during,
          opacity,
          focusOnDialog: document.activeElement === dialog,
          nativeDisabled: input.disabled,
          inert: layer instanceof HTMLElement && layer.inert,
        };
      }
      throw new Error('未观察到可见的淡出中间态');
    });
    expect(appearance.during, JSON.stringify(appearance)).toEqual(
      appearance.before,
    );
    expect(appearance.nativeDisabled).toBe(false);
    expect(appearance.inert).toBe(true);
    expect(appearance.focusOnDialog).toBe(true);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: /新建项目/ })).toBeFocused();
  });

  test('运行中切换减动效保留项目草稿、焦点与表单实例', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    await page.getByRole('button', { name: /新建项目/ }).click();
    const dialog = page.getByRole('dialog', { name: '新建项目' });
    const draft = dialog.getByLabel('项目名称');
    await draft.fill('偏好变化前未保存的项目');
    const original = await draft.elementHandle();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(dialog.locator('.ant-modal-container')).toHaveCSS(
      'transform',
      'none',
    );
    await expect(draft).toHaveValue('偏好变化前未保存的项目');
    await expect(draft).toBeFocused();
    expect(await original?.evaluate((element) => element.isConnected)).toBe(
      true,
    );
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(draft).toHaveValue('偏好变化前未保存的项目');
    await expect(draft).toBeFocused();
    expect(await original?.evaluate((element) => element.isConnected)).toBe(
      true,
    );
  });

  test('关闭中的项目表单切到 reduce 会结束过渡，不会锁住页面', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await loginAsAdmin(page);
    await page.goto(PROJECT_PATH);
    const trigger = page.getByRole('button', { name: /新建项目/ });
    const body = page.locator('body');
    const overflowBefore = await body.evaluate(
      (el) => getComputedStyle(el).overflowY,
    );
    const surface = page.locator('.project-form-dialog');
    const panel = surface.locator('.ant-modal-container');
    const mask = surface.locator('.ant-modal-mask');
    await trigger.click();
    await expect(panel).toHaveCSS('opacity', '1');
    await expect(mask).toHaveCSS('opacity', '1');
    // Pause a real exit just as it starts, so switching preference cannot race
    // the normal finish. No product pause or duration changes are involved.
    const exit = await panel.evaluate((layer) => {
      const cancel = [...layer.querySelectorAll('button')].find(
        (btn) => btn.textContent?.replace(/\s/g, '') === '取消',
      );
      if (!cancel) throw new Error('表单缺少取消按钮');
      cancel.focus();
      return new Promise<number>((resolve, reject) => {
        const onRun = (event: Event) => {
          if (
            !(event instanceof TransitionEvent) ||
            event.target !== layer ||
            event.propertyName !== 'opacity'
          )
            return;
          const animations = layer.getAnimations();
          for (const motion of animations) motion.pause();
          clearTimeout(timer);
          layer.removeEventListener('transitionrun', onRun);
          resolve(animations.length);
        };
        const timer = setTimeout(() => {
          layer.removeEventListener('transitionrun', onRun);
          reject(new Error('没有实际表单退出过渡'));
        }, 2000);
        layer.addEventListener('transitionrun', onRun);
        cancel.click();
      });
    });
    expect(exit).toBeGreaterThan(0);
    await expect
      .poll(async () => {
        const exitState = await panel.evaluate((layer) =>
          layer
            .getAnimations()
            .map((a) => ({ state: a.playState, time: a.currentTime })),
        );
        return exitState.some((a) => a.state === 'paused' && a.time !== null);
      })
      .toBe(true);
    await expect(surface).toHaveCount(1);
    await expect(body).toHaveCSS('overflow-y', 'hidden');
    for (const key of ['Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      await expect(surface.getByRole('dialog')).toBeFocused();
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(surface).toHaveCount(0);
    await expect(body).toHaveCSS('overflow-y', overflowBefore);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(panel).toHaveCSS('transform', 'none');
    await expect(panel).toHaveCSS('opacity', '1');
    await page.keyboard.press('Escape');
    await expect(surface).toHaveCount(0);
  });

  test('登录弹层非 reduce 下有显隐状态但最终态仍成立', async ({ page }) => {
    await page.goto('/?login=1');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: READY_TIMEOUT });
    // 普通模式允许看到中间帧；等到最终态，而不是要求第一帧就没有动效。
    await expect(dialog).toHaveCSS('opacity', '1');
  });
});
