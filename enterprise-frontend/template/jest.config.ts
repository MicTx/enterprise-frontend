import { configUmiAlias, createConfig } from '@umijs/max/test.js';

// 测试纪律：串行受限内存模式（npm run test:ci）；jest-dom 等需要 expect 的全局
// 初始化归 setupFilesAfterEnv（框架注入后执行），umi 自身 setupFiles 原样保留；
// 模块 mock 写在各测试文件内（engineering 篇）。
export default async (): Promise<any> => {
  const config = await configUmiAlias(createConfig({ target: 'browser' }));
  return {
    ...config,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    setupFilesAfterEnv: [
      ...(config.setupFilesAfterEnv || []),
      './tests/setupTests.jsx',
    ],
    // umi 测试链用 esbuild 转译，默认 classic JSX 需手引 React；对齐应用侧 tsconfig
    // 的 react-jsx（automatic），测试文件与应用一致免手引 React。
    globals: {
      ...(config.globals || {}),
      'jest-esbuild': { jsx: 'automatic' },
    },
    testEnvironmentOptions: {
      ...(config.testEnvironmentOptions || {}),
      url: 'http://localhost:8000',
    },
  };
};
