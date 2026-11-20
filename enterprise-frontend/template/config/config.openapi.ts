// UMI_ENV=openapi 变体入口：umi 仅合并主配置的环境变体（config/config.<UMI_ENV>.ts），
// 不会加载 config 目录里的任意文件，故这里一行转出 openapi.ts 的插件配置。
// 主配置 config/config.ts 零改动；仅在 `npm run openapi` 进程内生效。
export { default } from './openapi';
