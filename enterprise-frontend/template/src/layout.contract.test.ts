import fs from 'node:fs';
import path from 'node:path';

/**
 * 页面布局契约（layout-system 篇 §布局公理）：
 * 业务页面必须 PageShell → PageLayout → PageCell → PageCard → 内容组件。
 * 403 / 404 等全屏结果页是白名单；Modal / Drawer / Form 等页面子组件不按页面论。
 */
const PAGES_DIR = path.join(process.cwd(), 'src', 'pages');
const RESULT_PAGE_EXCEPTIONS = new Set(['403.tsx', '404.tsx']);
const NON_PAGE_SUFFIXES = /(Modal|Drawer|Form|Table|Chart|Card)\.tsx$/;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function pageFiles(): string[] {
  return walk(PAGES_DIR).filter((file) => {
    const name = path.basename(file);
    return (
      file.endsWith('.tsx') &&
      !file.endsWith('.test.tsx') &&
      !RESULT_PAGE_EXCEPTIONS.has(name) &&
      !NON_PAGE_SUFFIXES.test(name)
    );
  });
}

describe('页面布局契约', () => {
  it('每个业务页面使用 PageLayout → PageCell → PageCard', () => {
    const files = pageFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const where = path.relative(process.cwd(), file);
      for (const marker of ['<PageLayout', '<PageCell', '<PageCard']) {
        if (!source.includes(marker)) {
          throw new Error(`${where} 缺少 ${marker}`);
        }
      }
    }
  });

  it('业务页面不直接 import antd Card / 不写页面级栅格类', () => {
    for (const file of pageFiles()) {
      const source = fs.readFileSync(file, 'utf8');
      const where = path.relative(process.cwd(), file);
      if (
        /import\s*\{[^}]*\bCard\b[^}]*\}\s*from\s*['"]antd['"]/.test(source)
      ) {
        throw new Error(`${where} 不应直接 import antd Card`);
      }
      if (/grid-cols-/.test(source)) {
        throw new Error(`${where} 不应写页面级 grid-cols`);
      }
    }
  });
});
