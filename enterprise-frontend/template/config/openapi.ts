/**
 * OpenAPI 服务层代码生成配置（@umijs/max-plugin-openapi）。
 *
 * 加载链路：umi 只自动加载主配置 config/config.ts 及其环境变体
 * （config/config.<UMI_ENV>.ts），不会合并 config 目录里的任意文件；
 * `npm run openapi` 以 `UMI_ENV=openapi` 走 config/config.openapi.ts
 * 一行转出本文件——config/config.ts 主配置零改动，dev/build 不受影响。
 *
 * 字段语义（按插件 dist 源码校准，其 README 为空壳）：
 * - schemaPath 由 Node require() 解析，相对路径相对插件包自身目录，
 *   必须给绝对路径（本文件在 config/ 下，故取 ../openapi.json）。
 * - 输出目录不认 serversPath 配置（插件内部写死 <cwd>/src/services，
 *   再拼接 projectName），projectName: 'api' → src/services/api/。
 * - 生成代码 `import { request } from '@umijs/max'`（B1：不直连 axios），
 *   URL 前缀沿用 src/app.tsx 的 baseURL='/api'，spec 路径因此不含 /api。
 *
 * 接真实后端：把 schemaPath 换成后端 spec（http 地址或本地绝对路径）后
 * 重跑 `npm run openapi`；mock 自动生成保持关闭（不传 mock，避免写 mock/）。
 */
import { join } from 'path';

export default {
  plugins: ['@umijs/max-plugin-openapi'],
  openAPI: {
    requestLibPath: "import { request } from '@umijs/max'",
    schemaPath: join(__dirname, '..', 'openapi.json'),
    projectName: 'api',
  },
};
