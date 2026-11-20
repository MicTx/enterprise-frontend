/**
 * React Query 查询键字典 —— 全仓单一真源。
 *
 * 设计原则（queryKeys 真源模式，data-layer 篇）：
 * 1. 每个后端资源对应一个 root key；invalidate 只打 root key（前缀匹配全失效）。
 * 2. 带参变体用 selector 形式共享 root 前缀（如 keys.items({ page })）。
 * 3. 单实体 = [root, id]。
 * 4. 跨页聚合资源单键复用，invalidate 一次全部刷新。
 *
 * 反例（勿犯）：独立 key 前缀不共享 root → invalidate 失联、联动失效。
 */
export const queryKeys = {
  // 项目域：列表带分页/关键词参数共享 root 前缀，单实体挂 'detail' 分支。
  projects: (params?: {
    current?: number;
    pageSize?: number;
    keyword?: string;
  }) =>
    params ? (['projects', 'list', params] as const) : (['projects'] as const),
  project: (id: string) => ['projects', 'detail', id] as const,
} as const;
